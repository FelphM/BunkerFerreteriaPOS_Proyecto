/**
 * useOnlineStatus.js
 * ---------------------------------------------------------------------------
 * Detecta el estado de conexion y expone el conteo de ventas pendientes
 * de sincronizar. Dispara la sincronizacion automatica al recuperar conexion.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useState } from 'react';
import db from '../lib/offlineDB';
import { supabase } from '../lib/supabaseClient';

async function sincronizarPendientes() {
  const pendientes = await db.ventas_pendientes.toArray();
  if (!pendientes.length) return { sincronizadas: 0, errores: 0 };

  let sincronizadas = 0;
  let errores = 0;

  for (const venta of pendientes) {
    try {
      const { datos } = venta;

      // 1. Crear cabecera
      const { data: ventaDB, error: errV } = await supabase
        .from('ventas')
        .insert({
          nombre_cliente: datos.nombreCliente || 'Cliente General',
          rut_cliente: datos.rutCliente || null,
          correo_cliente: datos.correoCliente || null,
          metodo_pago: datos.metodoPago,
          observaciones: datos.observaciones || null,
          usuario_id: datos.usuarioId ?? null,
        })
        .select()
        .single();

      if (errV) throw new Error(errV.message);

      // 2. Insertar lineas
      const lineas = datos.lineas.map((l) => ({
        venta_id: ventaDB.id,
        variante_id: l.variante_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      }));

      const { error: errD } = await supabase.from('detalle_ventas').insert(lineas);

      if (errD) {
        await supabase.from('ventas').delete().eq('id', ventaDB.id);
        throw new Error(errD.message);
      }

      // Eliminar de la cola local al sincronizar exitosamente
      await db.ventas_pendientes.delete(venta.id);
      sincronizadas++;
    } catch (err) {
      await db.ventas_pendientes.update(venta.id, {
        intentos: (venta.intentos ?? 0) + 1,
        error: err.message,
      });
      errores++;
    }
  }

  return { sincronizadas, errores };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null); // { sincronizadas, errores }

  const refreshPendingCount = useCallback(async () => {
    const count = await db.ventas_pendientes.count();
    setPendingCount(count);
  }, []);

  const sincronizar = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const resultado = await sincronizarPendientes();
      setLastSync(resultado);
      await refreshPendingCount();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      sincronizar();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount, sincronizar]);

  return { isOnline, pendingCount, syncing, lastSync, sincronizar, refreshPendingCount };
}
