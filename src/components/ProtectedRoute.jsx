/**
 * ProtectedRoute.jsx
 * ---------------------------------------------------------------------------
 * Guardia de rutas privadas del sistema.
 *
 * Comportamiento:
 *   - Mientras Supabase inicializa la sesion (`loading = true`): muestra un
 *     splash de carga para evitar el "flash" de la pantalla de login.
 *   - Si el usuario NO esta autenticado: redirige a `/login`, guardando la
 *     ruta original en `location.state.from` para redirigir de vuelta tras
 *     el login exitoso.
 *   - Si el usuario SI esta autenticado: renderiza el `<Outlet />` (las rutas
 *     hijas del layout).
 *   - (Opcional) Si el perfil del usuario tiene `activo = false`: muestra
 *     un mensaje de cuenta desactivada en lugar del sistema.
 *
 * Uso en App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<AppLayout />}>
 *       ... rutas privadas ...
 *     </Route>
 *   </Route>
 * ---------------------------------------------------------------------------
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, loading, perfil } = useAuth();
  const location = useLocation();

  // ----- 1. Carga inicial: esperamos a que Supabase resuelva la sesion -----
  if (loading) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center vh-100 gap-3"
        style={{ background: 'var(--fp-bg, #eef0f3)' }}
      >
        {/* Splash coherente con la identidad visual */}
        <div className="fp-splash-logo">
          <i className="bi bi-wrench-adjustable-circle" />
        </div>
        <div className="text-secondary">
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          Cargando Bunker Ferreteria...
        </div>
      </div>
    );
  }

  // ----- 2. Sin sesion: redirigir al login --------------------------------
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ----- 3. Cuenta desactivada por el administrador -----------------------
  if (perfil && !perfil.activo) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="text-center" style={{ maxWidth: 400 }}>
          <i className="bi bi-person-x-fill display-1 text-danger mb-3 d-block" />
          <h2 className="h4">Cuenta desactivada</h2>
          <p className="text-secondary">
            Tu cuenta ha sido desactivada. Contacta al administrador del
            sistema para que la reactiven.
          </p>
        </div>
      </div>
    );
  }

  // ----- 4. Autenticado y activo: renderiza la ruta privada ---------------
  return <Outlet />;
}
