/**
 * RequireAdmin.jsx
 * ---------------------------------------------------------------------------
 * Guardia de rutas exclusivas de Administrador (Inventario, Compras,
 * Configuración). Se monta DENTRO de <ProtectedRoute> (ya hay sesión activa),
 * así que solo valida el rol del perfil.
 *
 * Esto es defensa en profundidad a nivel de UX: el bloqueo real de datos
 * vive en las políticas RLS de Supabase (ver backup_supaBase/rls_admin.sql).
 * Sin esas políticas, un cajero que llegue a la URL directamente igual no
 * podría escribir en las tablas protegidas, pero SÍ vería la pantalla — de
 * ahí que este componente exista además de las políticas.
 *
 * Uso en App.jsx:
 *   <Route element={<RequireAdmin />}>
 *     <Route path="inventario" element={<InventarioPage />} />
 *   </Route>
 * ---------------------------------------------------------------------------
 */
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function RequireAdmin() {
  const { perfil } = useAuth();

  if (perfil?.rol !== 'admin') {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 py-5">
        <div className="text-center" style={{ maxWidth: 400 }}>
          <i className="bi bi-shield-lock display-1 text-danger mb-3 d-block" />
          <h2 className="h4">Acceso restringido</h2>
          <p className="text-secondary">
            Esta sección es exclusiva para usuarios con rol Administrador.
            Contacta al administrador del sistema si necesitas acceso.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
