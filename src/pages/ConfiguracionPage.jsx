/**
 * ConfiguracionPage.jsx
 * ---------------------------------------------------------------------------
 * Configuracion del sistema:
 *   - Parametros generales (tabla `configuracion`, clave/valor).
 *   - Usuarios y roles (tabla `usuarios_perfiles`).
 *
 * Vista de consulta: la edicion se conectara a Supabase (ver marcadores TODO).
 * ---------------------------------------------------------------------------
 */
import { useMemo } from 'react';
import { getConfiguracion, getUsuarios } from '../data/queries';
import { formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';

// Color del badge segun rol de usuario.
const COLOR_ROL = {
  admin: 'primary',
  cajero: 'info',
  bodega: 'secondary',
};

export default function ConfiguracionPage() {
  const configuracion = useMemo(() => getConfiguracion(), []);
  const usuarios = useMemo(() => getUsuarios(), []);

  return (
    <>
      <PageHeader
        titulo="Configuracion"
        icono="bi-gear"
        descripcion="Parametros del sistema y usuarios"
      />

      <div className="fp-page-body">
        <div className="row g-3">
          {/* ----------------- Parametros generales -------------------- */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Parametros generales</h2>
              </div>
              <div className="card-body">
                {configuracion.map((cfg) => (
                  <div className="mb-3" key={cfg.id}>
                    <label className="form-label small fw-semibold mb-1">
                      {cfg.descripcion}
                      <span className="text-secondary fw-normal">
                        {' '}
                        ({cfg.clave})
                      </span>
                    </label>
                    {/* Input deshabilitado: la edicion va contra Supabase. */}
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={cfg.valor}
                      disabled
                      readOnly
                    />
                  </div>
                ))}
                {/* TODO: Supabase Update en tabla `configuracion`
                    (habilitar inputs y guardar por `clave`). */}
                <button
                  type="button"
                  className="btn btn-sm fp-btn-accent"
                  disabled
                >
                  <i className="bi bi-save me-1" />
                  Guardar cambios
                </button>
                <small className="d-block text-secondary mt-2">
                  La edicion de parametros se habilitara al conectar Supabase.
                </small>
              </div>
            </div>
          </div>

          {/* --------------------- Usuarios ---------------------------- */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Usuarios del sistema</h2>
                {/* TODO: Supabase - invitar usuario via Auth + usuarios_perfiles. */}
                <button
                  type="button"
                  className="btn btn-sm fp-btn-accent"
                  disabled
                >
                  <i className="bi bi-person-plus me-1" />
                  Nuevo usuario
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle m-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td className="fw-semibold text-nowrap">
                          {u.nombre}
                        </td>
                        <td>
                          <span
                            className={`badge bg-${
                              COLOR_ROL[u.rol] || 'secondary'
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge bg-${
                              u.activo ? 'success' : 'secondary'
                            }`}
                          >
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="text-nowrap text-secondary">
                          {formatFecha(u.creado_en)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* TODO: Supabase RPC `actualizar_usuario_admin`
                  (cambiar rol / activar / desactivar usuarios). */}
              <div className="card-footer bg-white">
                <small className="text-secondary">
                  La gestion de roles usa la funcion RPC{' '}
                  <code>actualizar_usuario_admin</code> (solo administradores).
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
