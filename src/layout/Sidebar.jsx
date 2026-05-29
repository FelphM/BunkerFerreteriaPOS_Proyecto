/**
 * Sidebar.jsx
 * ---------------------------------------------------------------------------
 * Barra de navegacion lateral fija (oscura) del sistema.
 *
 *   - Marca / logo arriba.
 *   - Lista de secciones (desde navItems.js) con <NavLink>.
 *   - Zona de usuario abajo: nombre y rol + boton Cerrar Sesion.
 * ---------------------------------------------------------------------------
 */
import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import { useAuth } from '../context/useAuth';

const LABEL_ROL = {
  admin: 'Administrador',
  cajero: 'Cajero',
  bodega: 'Bodega',
};

export default function Sidebar() {
  const { usuario, signOut } = useAuth();

  return (
    <aside className="fp-sidebar d-flex flex-column flex-shrink-0">
      {/* --------------------------- MARCA ----------------------------- */}
      <div className="fp-sidebar-brand d-flex align-items-center gap-2 px-3">
        <i className="bi bi-wrench-adjustable-circle fs-3 text-warning" />
        <div className="lh-1">
          <div className="fw-bold fs-5">Bunker Ferreteria</div>
          <small className="fp-sidebar-tagline">Sistema de Ventas</small>
        </div>
      </div>

      {/* ------------------------ NAVEGACION --------------------------- */}
      <nav className="fp-sidebar-nav flex-grow-1 overflow-auto px-2 py-3">
        <ul className="nav flex-column gap-1">
          {navItems.map((item) => (
            <li className="nav-item" key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `fp-nav-link d-flex align-items-center gap-3 ${isActive ? 'active' : ''}`
                }
              >
                <i className={`bi ${item.icono} fs-5`} />
                <span className="text-nowrap">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------------- USUARIO + LOGOUT ------------------------ */}
      <div className="fp-sidebar-user-wrap px-2 pb-2">
        <div className="fp-sidebar-user d-flex align-items-center gap-2 px-2 py-2 rounded">
          <div className="fp-avatar d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="bi bi-person-fill" />
          </div>
          <div className="lh-1 min-w-0 flex-grow-1">
            <div className="fw-semibold text-white text-truncate" title={usuario.nombre}>
              {usuario.nombre}
            </div>
            <small className="fp-sidebar-tagline">
              {LABEL_ROL[usuario.rol] ?? usuario.rol}
            </small>
          </div>
        </div>

        <button
          type="button"
          className="fp-btn-logout w-100 d-flex align-items-center gap-2"
          onClick={signOut}
          title="Cerrar sesion"
        >
          <i className="bi bi-box-arrow-left" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  );
}
