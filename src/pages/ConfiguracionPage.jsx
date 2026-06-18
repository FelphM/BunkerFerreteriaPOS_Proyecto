/**
 * ConfiguracionPage.jsx
 * ---------------------------------------------------------------------------
 * Configuracion del sistema:
 *   - Parametros generales editables (tabla `configuracion`).
 *   - Usuarios y roles (tabla `usuarios_perfiles`).
 *
 * REQUISITO RLS: para guardar parametros, ejecutar en Supabase SQL Editor:
 *   CREATE POLICY configuracion_update ON configuracion
 *     FOR UPDATE USING (auth.role() = 'authenticated')
 *     WITH CHECK (auth.role() = 'authenticated');
 * ---------------------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getConfiguracion, getUsuarios } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import AddUserModal from '../components/AddUserModal';

const COLOR_ROL = { admin: 'primary', cajero: 'info', bodega: 'secondary' };
const LABEL_ROL = { admin: 'Administrador', cajero: 'Cajero', bodega: 'Bodega' };

export default function ConfiguracionPage() {
  const { data: configuracion = [], refetch: refetchConfig } = useQuery(getConfiguracion);
  const { data: usuarios = [], refetch: refetchUsuarios } = useQuery(getUsuarios);

  // Estado local de edición: clave → valor editado
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, msg }
  const [showAddUser, setShowAddUser] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null); // { id, rol, activo }
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

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
            .then(({ error }) => { if (error) throw new Error(`${c.clave}: ${error.message}`); }),
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
    try {
      const { error } = await supabase
        .from('usuarios_perfiles')
        .update({ rol: editandoUsuario.rol, activo: editandoUsuario.activo })
        .eq('id', editandoUsuario.id);
      if (error) throw new Error(error.message);
      await refetchUsuarios();
      setEditandoUsuario(null);
    } catch (err) {
      window.alert(`Error: ${err.message}`);
    } finally {
      setGuardandoUsuario(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Configuracion" icono="bi-gear" descripcion="Parametros del sistema y usuarios" />

      <div className="fp-page-body">
        <div className="row g-3">
          {/* Parametros generales */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Parametros generales</h2>
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
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditandoUsuario({ id: u.id, rol: u.rol, activo: u.activo, nombre: u.nombre })}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-footer bg-white">
                <small className="text-secondary">
                  Los usuarios se crean desde el Dashboard de Supabase.
                  El rol se gestiona con la funcion RPC <code>actualizar_usuario_admin</code>.
                </small>
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
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEditandoUsuario(null); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-person-gear me-2 text-warning" />
                  Editar usuario
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditandoUsuario(null)} />
              </div>
              <div className="modal-body">
                <p className="fw-semibold mb-3">{editandoUsuario.nombre}</p>
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
                  onClick={() => setEditandoUsuario(null)} disabled={guardandoUsuario}>
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
