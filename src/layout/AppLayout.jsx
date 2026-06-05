/**
 * AppLayout.jsx
 * ---------------------------------------------------------------------------
 * Cascaron (shell) de la aplicacion: combina el <Sidebar /> plegable con el
 * area de contenido. El <Outlet /> de react-router-dom renderiza la vista
 * activa.
 *
 * Estados de sidebar:
 *   - Desktop (≥768px): visible, puede colapsarse a modo icono.
 *   - Mobil  (<768px):  oculto por defecto, se abre como panel superpuesto.
 * ---------------------------------------------------------------------------
 */
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabaseClient';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [itemsCriticos, setItemsCriticos] = useState(0);
  const [alertaCerrada, setAlertaCerrada] = useState(false);

  useEffect(() => {
    const verificarStockBajo = async () => {
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
      {/* Overlay para cerrar sidebar en movil */}
      {mobileSidebarOpen && (
        <div
          className="fp-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onDesktopToggle={() => setSidebarCollapsed((v) => !v)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="fp-content flex-grow-1 d-flex flex-column overflow-hidden">
        {/* Barra superior solo visible en movil */}
        <div className="fp-mobile-topbar">
          <button
            type="button"
            className="btn btn-link p-0 text-white text-decoration-none"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <i className="bi bi-list fs-3" />
          </button>
          <i className="bi bi-wrench-adjustable-circle fs-4 text-warning ms-2 me-1" />
          <span className="fw-bold text-white">Bunker Ferreteria</span>
        </div>

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
              <i className="bi bi-exclamation-triangle-fill me-2 fs-4 text-warning" />
              <div>
                <strong>Alerta de Inventario:</strong><br />
                Hay {itemsCriticos} {itemsCriticos === 1 ? 'producto' : 'productos'} con stock bajo el mínimo.
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setAlertaCerrada(true)}
              aria-label="Cerrar"
            />
          </div>
        )}
      </main>
    </div>
  );
}
