/**
 * Sidebar.jsx
 * ---------------------------------------------------------------------------
 * Barra de navegacion lateral del sistema. Soporta:
 *   - Modo expandido (232px) y colapsado/icono (60px) en desktop.
 *   - Modo overlay en movil: se oculta por defecto y se abre encima del
 *     contenido cuando el usuario pulsa el hamburger de la barra superior.
 * ---------------------------------------------------------------------------
 */
import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/ThemeContext';

const LABEL_ROL = {
  admin: 'Administrador',
  cajero: 'Cajero',
  bodega: 'Bodega',
};

export default function Sidebar({ collapsed, mobileOpen, onDesktopToggle, onMobileClose, badges = {} }) {
  const { usuario, signOut } = useAuth();
  const { dark, toggleTheme } = useTheme();

  const sidebarClass = [
    'fp-sidebar d-flex flex-column flex-shrink-0',
    collapsed ? 'fp-collapsed' : '',
    mobileOpen ? 'fp-mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClass}>
      {/* --------------------------- MARCA ----------------------------- */}
      <div className="fp-sidebar-brand d-flex align-items-center gap-2 px-3">
        <i className="bi bi-wrench-adjustable-circle fs-3 text-warning flex-shrink-0" />
        {!collapsed && (
          <div className="lh-1 flex-grow-1 overflow-hidden">
            <div className="fw-bold fs-5 text-truncate">Bunker Ferreteria</div>
            <small className="fp-sidebar-tagline">Sistema de Ventas</small>
          </div>
        )}

        {/* Boton colapsar/expandir — solo desktop */}
        <button
          type="button"
          className="fp-sidebar-toggle d-none d-md-flex align-items-center justify-content-center"
          onClick={onDesktopToggle}
          title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} />
        </button>

        {/* Boton cerrar — solo movil */}
        <button
          type="button"
          className="fp-sidebar-toggle d-flex d-md-none align-items-center justify-content-center ms-auto"
          onClick={onMobileClose}
          title="Cerrar menu"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* ------------------------ NAVEGACION --------------------------- */}
      <nav className="fp-sidebar-nav flex-grow-1 overflow-auto px-2 py-3">
        <ul className="nav flex-column gap-1">
          {navItems.map((item) => (
            <li className="nav-item" key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  [
                    'fp-nav-link d-flex align-items-center gap-3',
                    isActive ? 'active' : '',
                    collapsed ? 'fp-nav-link-collapsed' : '',
                  ].filter(Boolean).join(' ')
                }
                onClick={() => {
                  if (window.innerWidth < 768) onMobileClose?.();
                }}
              >
                <div className="position-relative flex-shrink-0">
                  <i className={`bi ${item.icono} fs-5`} />
                  {collapsed && badges[item.path] > 0 && <span className="fp-nav-badge-dot" />}
                </div>
                {!collapsed && <span className="text-nowrap">{item.label}</span>}
                {!collapsed && badges[item.path] > 0 && (
                  <span className="fp-nav-badge ms-auto">
                    {badges[item.path] > 99 ? '99+' : badges[item.path]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------------- USUARIO + LOGOUT ------------------------ */}
      <div className="fp-sidebar-user-wrap px-2 pb-2">
        <div className={`fp-sidebar-user d-flex align-items-center gap-2 px-2 py-2 rounded${collapsed ? ' justify-content-center' : ''}`}>
          <div className="fp-avatar d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="bi bi-person-fill" />
          </div>
          {!collapsed && (
            <div className="lh-1 min-w-0 flex-grow-1">
              <div className="fw-semibold text-white text-truncate" title={usuario.nombre}>
                {usuario.nombre}
              </div>
              <small className="fp-sidebar-tagline">
                {LABEL_ROL[usuario.rol] ?? usuario.rol}
              </small>
            </div>
          )}
        </div>

        {/* Toggle tema claro / oscuro */}
        <button
          type="button"
          className={`fp-btn-logout w-100 d-flex align-items-center gap-2${collapsed ? ' justify-content-center' : ''}`}
          onClick={toggleTheme}
          title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`} />
          {!collapsed && <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        <button
          type="button"
          className={`fp-btn-logout w-100 d-flex align-items-center gap-2${collapsed ? ' justify-content-center' : ''}`}
          onClick={signOut}
          title="Cerrar sesion"
        >
          <i className="bi bi-box-arrow-left" />
          {!collapsed && <span>Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  );
}
