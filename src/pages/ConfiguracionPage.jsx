/**
 * ConfiguracionPage.jsx
 * ---------------------------------------------------------------------------
 * Configuración del sistema:
 *   - Parámetros generales editables (tabla `configuracion`).
 *   - Usuarios y roles (tabla `usuarios_perfiles`), edición solo para admin.
 *
 * REQUISITO RLS: para guardar parámetros, ejecutar en Supabase SQL Editor:
 *   CREATE POLICY configuracion_update ON configuracion
 *     FOR UPDATE USING (auth.role() = 'authenticated')
 *     WITH CHECK (auth.role() = 'authenticated');
 *
 * REQUISITO RLS: para que un admin pueda cambiar rol/estado de otro usuario,
 * ejecutar en Supabase SQL Editor (la tabla usuarios_perfiles solo tiene
 * policy de SELECT — sin esto, el UPDATE es bloqueado en silencio: PostgREST
 * responde éxito con 0 filas afectadas y no hay forma de detectarlo salvo
 * revisando el largo de `data` tras el `.select()`):
 *   CREATE POLICY usuarios_update_admin ON usuarios_perfiles
 *     FOR UPDATE USING (
 *       EXISTS (SELECT 1 FROM usuarios_perfiles up WHERE up.id = auth.uid() AND up.rol = 'admin')
 *     )
 *     WITH CHECK (
 *       EXISTS (SELECT 1 FROM usuarios_perfiles up WHERE up.id = auth.uid() AND up.rol = 'admin')
 *     );
 *
 * Esta página además está gateada a nivel de ruta por <RequireAdmin /> (ver
 * App.jsx): solo el rol admin puede navegar a /configuracion. La restricción
 * real de escritura contra intentos directos a la API vive en
 * backup_supaBase/rls_admin_restrictions.sql (incluye también Inventario y
 * Compras, los otros casos de uso exclusivos de Administrador).
 * ---------------------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getConfiguracion, getUsuarios } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../context/useAuth';
import { formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import AddUserModal from '../components/AddUserModal';

const COLOR_ROL = { admin: 'primary', cajero: 'info', bodega: 'secondary' };
const LABEL_ROL = { admin: 'Administrador', cajero: 'Cajero', bodega: 'Bodega' };

export default function ConfiguracionPage() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'admin';
  const { data: configuracion = [], refetch: refetchConfig } = useQuery(getConfiguracion);
  const { data: usuarios = [], refetch: refetchUsuarios } = useQuery(getUsuarios);

  // Estado local de edición: clave → valor editado
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, msg }
  const [showAddUser, setShowAddUser] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null); // { id, rol, activo }
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState(null);

  // Sincroniza el estado local cuando se cargan los datos
  useEffect(() => {
    if (configuracion.length) {
      setValores(Object.fromEntries(configuracion.map((c) => [c.clave, c.valor])));
    }
  }, [configuracion]);

  const hayCambios = configuracion.some((c) => valores[c.clave] !== c.valor);

  async function handleGuardar() {
    setGuardando(true);
    setResultado(null);
    try {
      const cambios = configuracion.filter((c) => valores[c.clave] !== c.valor);
      await Promise.all(
        cambios.map((c) =>
          supabase
            .from('configuracion')
            .update({ valor: valores[c.clave] })
            .eq('clave', c.clave)
            .select()
            .then(({ data, error }) => {
              if (error) throw new Error(`${c.clave}: ${error.message}`);
              // PostgREST no reporta error si RLS bloquea el UPDATE: devuelve
              // éxito con 0 filas afectadas. Lo detectamos a mano.
              if (!data || data.length === 0) {
                throw new Error(
                  `No se pudo guardar "${c.clave}": falta la política RLS de UPDATE en la tabla ` +
                  `configuracion (ver comentario al inicio de ConfiguracionPage.jsx).`,
                );
              }
            }),
        ),
      );
      await refetchConfig();
      setResultado({ ok: true, msg: 'Cambios guardados correctamente.' });
    } catch (err) {
      setResultado({ ok: false, msg: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarUsuario() {
    if (!editandoUsuario) return;
    setGuardandoUsuario(true);
    setErrorUsuario(null);
    try {
      const { data, error } = await supabase
        .from('usuarios_perfiles')
        .update({ rol: editandoUsuario.rol, activo: editandoUsuario.activo })
        .eq('id', editandoUsuario.id)
        .select();

      if (error) throw new Error(error.message);
      // PostgREST no reporta error si RLS bloquea el UPDATE: devuelve éxito
      // con 0 filas afectadas. Lo detectamos a mano (ver comentario de
      // cabecera con la política RLS que falta).
      if (!data || data.length === 0) {
        throw new Error(
          'No se pudo guardar: falta la política RLS de UPDATE para administradores en ' +
          'la tabla usuarios_perfiles (ver comentario al inicio de ConfiguracionPage.jsx).',
        );
      }

      await refetchUsuarios();
      setEditandoUsuario(null);
    } catch (err) {
      setErrorUsuario(err.message);
    } finally {
      setGuardandoUsuario(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Configuración" icono="bi-gear" descripcion="Parámetros del sistema y usuarios" />

      <div className="fp-page-body">
        <div className="row g-3">
          {/* Parámetros generales */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Parámetros generales</h2>
                {hayCambios && (
                  <span className="badge bg-warning text-dark">Sin guardar</span>
                )}
              </div>
              <div className="card-body">
                {resultado && (
                  <div className={`alert alert-${resultado.ok ? 'success' : 'danger'} py-2 mb-3 small`}>
                    <i className={`bi bi-${resultado.ok ? 'check-circle' : 'exclamation-triangle'} me-2`} />
                    {resultado.msg}
                  </div>
                )}
                {configuracion.map((cfg) => (
                  <div className="mb-3" key={cfg.id}>
                    <label className="form-label small fw-semibold mb-1">
                      {cfg.descripcion || cfg.clave}
                      <span className="text-secondary fw-normal ms-1">({cfg.clave})</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${
                        valores[cfg.clave] !== cfg.valor ? 'border-warning' : ''
                      }`}
                      value={valores[cfg.clave] ?? cfg.valor}
                      onChange={(e) => {
                        setValores((v) => ({ ...v, [cfg.clave]: e.target.value }));
                        setResultado(null);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="card-footer bg-white d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-sm fp-btn-accent"
                  onClick={handleGuardar}
                  disabled={guardando || !hayCambios}
                >
                  {guardando ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                  ) : (
                    <><i className="bi bi-floppy me-1" />Guardar cambios</>
                  )}
                </button>
                {hayCambios && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setValores(Object.fromEntries(configuracion.map((c) => [c.clave, c.valor])));
                      setResultado(null);
                    }}
                  >
                    Descartar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Usuarios */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Usuarios del sistema</h2>
                <button type="button" className="btn btn-sm fp-btn-accent"
                  onClick={() => setShowAddUser(true)}>
                  <i className="bi bi-person-plus me-1" />Nuevo usuario
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
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td className="fw-semibold text-nowrap">{u.nombre}</td>
                        <td>
                          <span className={`badge bg-${COLOR_ROL[u.rol] || 'secondary'}`}>
                            {LABEL_ROL[u.rol] || u.rol}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${u.activo ? 'success' : 'secondary'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="text-nowrap text-secondary">{formatFecha(u.creado_en)}</td>
                        <td className="text-end">
                          {esAdmin && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setEditandoUsuario({ id: u.id, rol: u.rol, activo: u.activo, nombre: u.nombre })}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal editar usuario */}
      {editandoUsuario && (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditandoUsuario(null); setErrorUsuario(null); } }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-person-gear me-2 text-warning" />
                  Editar usuario
                </h5>
                <button type="button" className="btn-close" onClick={() => { setEditandoUsuario(null); setErrorUsuario(null); }} />
              </div>
              <div className="modal-body">
                <p className="fw-semibold mb-3">{editandoUsuario.nombre}</p>
                {errorUsuario && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle me-2" />{errorUsuario}
                    {errorUsuario.includes('política RLS') ? (
                      <div className="mt-2 text-secondary" style={{ fontSize: '0.8rem' }}>
                        Ejecuta la policy <code>usuarios_update_admin</code> en el SQL Editor de Supabase (ver comentario de cabecera de este archivo).
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Rol</label>
                  <select
                    className="form-select form-select-sm"
                    value={editandoUsuario.rol}
                    onChange={(e) => setEditandoUsuario((u) => ({ ...u, rol: e.target.value }))}
                  >
                    <option value="admin">Administrador</option>
                    <option value="cajero">Cajero</option>
                    <option value="bodega">Bodega</option>
                  </select>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="chk-activo"
                    checked={editandoUsuario.activo}
                    onChange={(e) => setEditandoUsuario((u) => ({ ...u, activo: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="chk-activo">Usuario activo</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => { setEditandoUsuario(null); setErrorUsuario(null); }} disabled={guardandoUsuario}>
                  Cancelar
                </button>
                <button type="button" className="btn fp-btn-accent btn-sm"
                  onClick={handleGuardarUsuario} disabled={guardandoUsuario}>
                  {guardandoUsuario
                    ? <><span className="spinner-border spinner-border-sm me-1" />Guardando...</>
                    : <><i className="bi bi-check-lg me-1" />Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editandoUsuario && <div className="modal-backdrop fade show" />}

      <AddUserModal
        show={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserCreated={() => refetchUsuarios()}
      />
    </>
  );
}
