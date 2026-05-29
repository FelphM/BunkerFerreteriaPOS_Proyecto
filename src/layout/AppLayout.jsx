/**
 * AppLayout.jsx
 * ---------------------------------------------------------------------------
 * Cascaron (shell) de la aplicacion: combina el <Sidebar /> fijo con el area
 * de contenido. El <Outlet /> de react-router-dom renderiza la vista activa.
 *
 * Todas las vistas (POS, Dashboard, Inventario, ...) viven dentro de este
 * layout, lo que garantiza cohesion visual en todo el sistema.
 * ---------------------------------------------------------------------------
 */
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabaseClient';

export default function AppLayout() {
  const [itemsCriticos, setItemsCriticos] = useState(0);
  const [alertaCerrada, setAlertaCerrada] = useState(false);

  useEffect(() => {
    // Cuenta variantes activas con stock en o bajo el minimo.
    const verificarStockBajo = async () => {
      // Supabase no soporta filtros entre columnas directamente en el cliente,
      // por lo que traemos las columnas necesarias y filtramos en JS.
      const { data: variantes } = await supabase
        .from('producto_variantes')
        .select('id, stock_actual, stock_minimo')
        .eq('activo', true);

      if (!variantes) return;

      const totalBajoStock = variantes.filter(
        (v) => v.stock_actual <= v.stock_minimo
      ).length;

      setItemsCriticos(totalBajoStock);
      if (totalBajoStock === 0) setAlertaCerrada(false);
    };

    verificarStockBajo();

    // Canal de Realtime: re-verifica el stock cuando la tabla cambia.
    // Esto cubre tanto ventas (descuento de stock) como ingresos de compras.
    const channel = supabase
      .channel('stock-alertas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producto_variantes' },
        () => verificarStockBajo(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="fp-app d-flex vh-100 overflow-hidden">
      <Sidebar />
      <main className="fp-content flex-grow-1 d-flex flex-column overflow-hidden">
        <Outlet />
        {itemsCriticos > 0 && !alertaCerrada && (
          <div
            className="alert alert-warning alert-dismissible fade show shadow-lg border-start border-4 border-warning m-3 position-absolute"
            role="alert"
            style={{
              bottom: '10px',
              right: '10px',
              zIndex: 1100,
              maxWidth: '380px'
            }}
          >
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-4 text-warning"></i>
              <div>
                <strong>Alerta de Inventario:</strong><br/>
                Hay {itemsCriticos} {itemsCriticos === 1 ? 'producto' : 'productos'} con stock bajo el mínimo.
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setAlertaCerrada(true)}
              aria-label="Cerrar"
            ></button>
          </div>
        )}
      </main>
    </div>
  );
}
