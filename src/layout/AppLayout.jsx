/**
 * AppLayout.jsx
 * ---------------------------------------------------------------------------
 * Cascarón (shell) de la aplicación: combina el <Sidebar /> plegable con el
 * área de contenido. El <Outlet /> de react-router-dom renderiza la vista
 * activa.
 *
 * Estados de sidebar:
 *   - Desktop (≥768px): visible, puede colapsarse a modo icono.
 *   - Móvil  (<768px):  oculto por defecto, se abre como panel superpuesto.
 * ---------------------------------------------------------------------------
 */
import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabaseClient';
import { getConfigNumero } from '../data/queries';

export default function AppLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [itemsCriticos, setItemsCriticos] = useState(0);
  const [alertaCerrada, setAlertaCerrada] = useState(false);
  const [facturasUrgentes, setFacturasUrgentes] = useState(0);

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

  const verificarFacturas = useCallback(async () => {
    const diasAlerta = (await getConfigNumero('dias_alerta_vencimiento')) || 7;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + diasAlerta);
    const limiteStr = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;

    const { count, error } = await supabase
      .from('facturas_proveedores')
      .select('*', { count: 'exact', head: true })
      .neq('estado_pago', 'pagada')
      .neq('estado_pago', 'anulada')
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', limiteStr);

    if (!error) setFacturasUrgentes(count ?? 0);
  }, []);

  useEffect(() => {
    verificarFacturas();

    const channel = supabase
      .channel('facturas-alertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturas_proveedores' }, verificarFacturas)
      .subscribe();

    window.addEventListener('fp:facturas-changed', verificarFacturas);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('fp:facturas-changed', verificarFacturas);
    };
  }, [verificarFacturas]);

  // Recalcula al cambiar de vista (AppLayout no se desmonta entre rutas,
  // así que esto es lo que garantiza ver el número al día sin recargar).
  useEffect(() => {
    verificarFacturas();
  }, [location.pathname, verificarFacturas]);

  return (
    <div className="fp-app d-flex vh-100 overflow-hidden">
      {/* Overlay para cerrar sidebar en móvil */}
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
        badges={{ '/facturas': facturasUrgentes }}
      />

      <main className="fp-content flex-grow-1 d-flex flex-column overflow-hidden">
        {/* Barra superior solo visible en móvil */}
        <div className="fp-mobile-topbar">
          <button
            type="button"
            className="btn btn-link p-0 text-white text-decoration-none"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <i className="bi bi-list fs-3" />
          </button>
          <i className="bi bi-wrench-adjustable-circle fs-4 text-warning ms-2 me-1" />
          <span className="fw-bold text-white">Bunker Ferretería</span>
        </div>

        <Outlet />

        {itemsCriticos > 0 && !alertaCerrada && (
          <div
            className="alert alert-warning alert-dismissible fade show shadow-lg border-start border-4 border-warning m-3 position-absolute"
            role="alert"
            style={{
              bottom: '10px',
              right: '10px',
              zIndex: 1040,
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
