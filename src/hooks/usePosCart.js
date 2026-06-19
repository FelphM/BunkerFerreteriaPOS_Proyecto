/**
 * usePosCart.js
 * ---------------------------------------------------------------------------
 * Custom Hook con TODA la logica de negocio del Punto de Venta:
 *
 *   - Estado del carrito de compra.
 *   - Alta / baja / edicion de cantidades (acepta decimales).
 *   - Calculos matematicos (subtotal, neto, IVA, total) con useMemo.
 *   - Ventas en espera ("Apartar" / "Recuperar").
 *   - Escritura a Supabase: ventas, detalle_ventas, ventas_en_espera.
 * ---------------------------------------------------------------------------
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getVentasEnEspera, getConfigNumero } from '../data/queries';
import { safeQty } from '../utils/format';
import db from '../lib/offlineDB';
import { useAuth } from '../context/useAuth';

export function usePosCart() {
  const { session } = useAuth();

  // -------------------------------------------------------------------------
  // ESTADO
  // -------------------------------------------------------------------------
  const [cart, setCart] = useState([]);
  const [heldSales, setHeldSales] = useState([]);
  const [ivaPct, setIvaPct] = useState(19); // default hasta que cargue config

  // Carga la configuracion y las ventas en espera al montar.
  useEffect(() => {
    getConfigNumero('porcentaje_iva').then((v) => { if (v) setIvaPct(v); });
    getVentasEnEspera().then(setHeldSales).catch(console.error);
  }, []);

  // -------------------------------------------------------------------------
  // ACCIONES DEL CARRITO
  // -------------------------------------------------------------------------

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, cantidad: safeQty(i.cantidad) + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          codigo: item.codigo,
          id_producto: item.id_producto,
          nombre: item.nombre,
          variante_nombre: item.variante_nombre,
          tieneVariantes: item.tieneVariantes,
          precio_venta: item.precio_venta,
          unidad_venta: item.unidad_venta,
          codigo_barras: item.codigo_barras,
          cantidad: 1,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((variantId, cantidad) => {
    setCart((prev) =>
      prev.map((i) => (i.id === variantId ? { ...i, cantidad } : i)),
    );
  }, []);

  const changeQuantity = useCallback((variantId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === variantId
            ? { ...i, cantidad: safeQty(i.cantidad) + delta }
            : i,
        )
        .filter((i) => safeQty(i.cantidad) > 0),
    );
  }, []);

  const removeItem = useCallback((variantId) => {
    setCart((prev) => prev.filter((i) => i.id !== variantId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // -------------------------------------------------------------------------
  // VENTAS EN ESPERA ("APARTAR" / "RECUPERAR")
  // -------------------------------------------------------------------------

  const pauseSale = useCallback(
    async (nombreReferencia) => {
      if (cart.length === 0) return false;

      const nuevaEspera = {
        nombre_referencia: nombreReferencia?.trim() || 'Venta sin nombre',
        carrito: cart, // JSONB en Supabase
      };

      // Supabase Insert en tabla `ventas_en_espera`.
      const { data, error } = await supabase
        .from('ventas_en_espera')
        .insert(nuevaEspera)
        .select()
        .single();

      if (error) {
        console.error('[usePosCart] Error al pausar venta:', error.message);
        return false;
      }

      setHeldSales((prev) => [...prev, data]);
      clearCart();
      return true;
    },
    [cart, clearCart],
  );

  const recoverSale = useCallback(async (esperaId) => {
    const espera = heldSales.find((e) => e.id === esperaId);
    if (espera) setCart(espera.carrito || []);

    // Supabase Delete de la fila recuperada en `ventas_en_espera`.
    const { error } = await supabase
      .from('ventas_en_espera')
      .delete()
      .eq('id', esperaId);

    if (error) {
      console.error('[usePosCart] Error al eliminar venta en espera:', error.message);
    }

    setHeldSales((prev) => prev.filter((e) => e.id !== esperaId));
  }, [heldSales]);

  // -------------------------------------------------------------------------
  // FINALIZAR VENTA (Supabase Insert)
  // -------------------------------------------------------------------------

  /**
   * Persiste la venta en Supabase:
   *   1. Insert en `ventas` (cabecera).
   *   2. Insert en `detalle_ventas` (lineas).
   *   El trigger `tg_descontar_stock_venta` descuenta el stock automaticamente.
   *   El trigger `tg_recalcular_total_venta` calcula el total automaticamente.
   *
   * @param {object} datos - { nombreCliente, rutCliente, correoCliente,
   *                           metodoPago, observaciones }
   * @returns {Promise<{ success: boolean, venta?: object, error?: string }>}
   */
  const finalizarVenta = useCallback(
    async ({ nombreCliente, rutCliente, correoCliente, metodoPago, observaciones }) => {
      if (cart.length === 0) return { success: false, error: 'Carrito vacio' };

      const usuarioId = session?.user?.id ?? null;

      // Si no hay conexion, guardar en Dexie para sync posterior.
      if (!navigator.onLine) {
        const lineas = cart.map((item) => ({
          variante_id: item.id,
          cantidad: safeQty(item.cantidad),
          precio_unitario: item.precio_venta,
        }));
        await db.ventas_pendientes.add({
          creado_en: new Date().toISOString(),
          intentos: 0,
          error: null,
          datos: { nombreCliente, rutCliente, correoCliente, metodoPago, observaciones, usuarioId, lineas },
        });
        clearCart();
        return { success: true, offline: true };
      }

      // 1. Crear cabecera de la venta.
      const { data: venta, error: errVenta } = await supabase
        .from('ventas')
        .insert({
          nombre_cliente: nombreCliente || 'Cliente General',
          rut_cliente: rutCliente || null,
          correo_cliente: correoCliente || null,
          metodo_pago: metodoPago,
          observaciones: observaciones || null,
          usuario_id: usuarioId,
        })
        .select()
        .single();

      if (errVenta) return { success: false, error: errVenta.message };

      // 2. Insertar lineas de detalle.
      const lineas = cart.map((item) => ({
        venta_id: venta.id,
        variante_id: item.id,
        cantidad: safeQty(item.cantidad),
        precio_unitario: item.precio_venta,
      }));

      const { error: errDetalle } = await supabase.from('detalle_ventas').insert(lineas);

      if (errDetalle) {
        await supabase.from('ventas').delete().eq('id', venta.id);
        return { success: false, error: errDetalle.message };
      }

      clearCart();
      return { success: true, venta };
    },
    [cart, clearCart],
  );

  // -------------------------------------------------------------------------
  // CALCULOS
  // -------------------------------------------------------------------------
  const totals = useMemo(() => {
    const total = cart.reduce(
      (acc, i) => acc + safeQty(i.cantidad) * i.precio_venta,
      0,
    );
    const neto = total / (1 + ivaPct / 100);
    const iva = total - neto;
    const cantidadItems = cart.reduce((acc, i) => acc + safeQty(i.cantidad), 0);

    return {
      neto: Math.round(neto),
      iva: Math.round(iva),
      total: Math.round(total),
      cantidadItems,
      lineas: cart.length,
    };
  }, [cart, ivaPct]);

  // -------------------------------------------------------------------------
  // API PUBLICA
  // -------------------------------------------------------------------------
  return {
    cart,
    heldSales,
    totals,
    ivaPct,
    addToCart,
    updateQuantity,
    changeQuantity,
    removeItem,
    clearCart,
    pauseSale,
    recoverSale,
    finalizarVenta,
  };
}
