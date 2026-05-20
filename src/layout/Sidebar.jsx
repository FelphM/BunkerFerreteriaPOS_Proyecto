/**
 * Sidebar.jsx
 * ---------------------------------------------------------------------------
 * Barra de navegacion lateral fija (oscura) del sistema.
 *
 *   - Marca / logo arriba.
 *   - Lista de secciones (desde navItems.js) con <NavLink>: la seccion activa
 *     se resalta automaticamente segun la URL.
 *   - Tarjeta de usuario abajo.
 *
 * Es puramente presentacional; el ruteo lo maneja react-router-dom.
 * ---------------------------------------------------------------------------
 */
import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import { getConfigValor } from '../data/queries';

export default function Sidebar() {
  return (
    <aside className="fp-sidebar d-flex flex-column flex-shrink-0">
      {/* --------------------------- MARCA ----------------------------- */}
      <div className="fp-sidebar-brand d-flex align-items-center gap-2 px-3">
        <i className="bi bi-wrench-adjustable-circle fs-3 text-warning" />
        <div className="lh-1">
          <div className="fw-bold fs-5">Ferromat</div>
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
                // `end` evita que "/" quede activo en todas las rutas.
                end={item.path === '/'}
                className={({ isActive }) =>
                  `fp-nav-link d-flex align-items-center gap-3 ${
                    isActive ? 'active' : ''
                  }`
                }
              >
                <i className={`bi ${item.icono} fs-5`} />
                <span className="text-nowrap">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------- USUARIO ----------------------------- */}
      <div className="fp-sidebar-user d-flex align-items-center gap-2 px-3">
        <div className="fp-avatar d-flex align-items-center justify-content-center">
          <i className="bi bi-person-fill" />
        </div>
        <div className="lh-1">
          {/* TODO: Supabase - reemplazar por el usuario autenticado (auth.users). */}
          <div className="fw-semibold">Admin</div>
          <small className="fp-sidebar-tagline">
            {getConfigValor('nombre_tienda')}
          </small>
        </div>
      </div>
    </aside>
  );
}
