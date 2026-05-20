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
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="fp-app d-flex vh-100 overflow-hidden">
      <Sidebar />
      <main className="fp-content flex-grow-1 d-flex flex-column overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
