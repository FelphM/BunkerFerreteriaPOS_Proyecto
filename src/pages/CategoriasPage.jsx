/**
 * CategoriasPage.jsx
 * ---------------------------------------------------------------------------
 * Gestión de categorías. Permite crear, cambiar el ícono y eliminar.
 *
 * REQUISITO BD: la tabla `categorias` debe tener la columna:
 *   icono TEXT DEFAULT 'bi-box-seam'
 * Si aún no existe, ejecutar en Supabase SQL Editor:
 *   ALTER TABLE categorias ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'bi-box-seam';
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQuery } from '../hooks/useQuery';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';

// Iconos disponibles para categorías (Bootstrap Icons relevantes a ferretería)
const ICONOS_DISPONIBLES = [
  'bi-box-seam', 'bi-tools', 'bi-nut', 'bi-hammer', 'bi-wrench',
  'bi-wrench-adjustable', 'bi-screwdriver', 'bi-lightning-charge',
  'bi-plug', 'bi-outlet', 'bi-droplet', 'bi-pipe', 'bi-bricks',
  'bi-palette', 'bi-brush', 'bi-paint-bucket', 'bi-rulers',
  'bi-triangle', 'bi-shield', 'bi-lock', 'bi-key', 'bi-door-open',
  'bi-window', 'bi-house', 'bi-building', 'bi-cone-striped',
  'bi-grid-3x3', 'bi-layers', 'bi-archive', 'bi-bag',
  'bi-cart', 'bi-fire', 'bi-snow', 'bi-fan', 'bi-thermometer',
  'bi-gear', 'bi-cpu', 'bi-pc-display', 'bi-lamp', 'bi-lightbulb',
  'bi-battery-full', 'bi-minecart', 'bi-truck', 'bi-ladder',
  'bi-scissors', 'bi-bandaid', 'bi-clipboard', 'bi-tags', 'bi-tag',
  'bi-star', 'bi-award', 'bi-trophy', 'bi-check-circle',
];

const ICONO_DEFAULT = 'bi-box-seam';

async function getCategoriasConConteo() {
  const res = await supabase
    .from('categorias')
    .select('*, productos(count)')
    .order('nombre');
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((c) => ({
    ...c,
    icono: c.icono || ICONO_DEFAULT,
    productos_count: c.productos?.[0]?.count ?? 0,
  }));
}

const FORM_VACIO = { nombre: '', descripcion: '', icono: ICONO_DEFAULT };

export default function CategoriasPage() {
  const { data: categorias = [], refetch } = useQuery(getCategoriasConConteo);
  const [busqueda, setBusqueda] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editandoIcono, setEditandoIcono] = useState(null); // { id, icono }
  const [editandoCategoria, setEditandoCategoria] = useState(null); // categoria completa

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return categorias;
    return categorias.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q),
    );
  }, [categorias, busqueda]);

  const totalProductos = useMemo(
    () => categorias.reduce((s, c) => s + c.productos_count, 0),
    [categorias],
  );

  async function handleCambiarIcono(id, nuevoIcono) {
    const { error } = await supabase
      .from('categorias')
      .update({ icono: nuevoIcono })
      .eq('id', id);
    if (error) window.alert(`Error: ${error.message}`);
    else refetch();
    setEditandoIcono(null);
  }

  async function handleEliminar(cat) {
    if (cat.productos_count > 0) { setConfirmDelete(cat); return; }
    await ejecutarEliminar(cat.id);
  }

  async function ejecutarEliminar(id) {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) window.alert(`Error al eliminar: ${error.message}`);
    else refetch();
    setConfirmDelete(null);
  }

  return (
    <>
      <PageHeader
        titulo="Categorias"
        icono="bi-tags"
        descripcion={`${categorias.length} categorias registradas`}
      >
        <button type="button" className="btn fp-btn-accent" onClick={() => setShowAdd(true)}>
          <i className="bi bi-plus-lg me-1" />Nueva categoria
        </button>
      </PageHeader>

      <div className="fp-page-body">
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-4">
            <StatCard titulo="Categorias" valor={categorias.length} icono="bi-tags" color="primary" />
          </div>
          <div className="col-sm-6 col-xl-4">
            <StatCard titulo="Productos categorizados" valor={totalProductos} icono="bi-box-seam" color="info" />
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm fp-filtro-busqueda">
              <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar categoria..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <span className="ms-auto small text-secondary">{filtradas.length} resultado(s)</span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 56 }}>Icono</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th className="text-center">Productos</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary py-4">
                      Sin categorias para la busqueda actual.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Cambiar icono"
                          onClick={() => setEditandoIcono({ id: cat.id, icono: cat.icono })}
                        >
                          <i className={`bi ${cat.icono} text-warning`} />
                        </button>
                      </td>
                      <td className="fw-semibold">{cat.nombre}</td>
                      <td className="text-secondary">
                        {cat.descripcion || <span className="text-muted">—</span>}
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary">{cat.productos_count}</span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="Editar categoria"
                          onClick={() => setEditandoCategoria(cat)}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title={cat.productos_count > 0 ? 'Tiene productos asociados' : 'Eliminar'}
                          onClick={() => handleEliminar(cat)}
                          disabled={cat.productos_count > 0}
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {categorias.some((c) => c.productos_count > 0) && (
            <div className="card-footer bg-white text-secondary small">
              <i className="bi bi-info-circle me-1" />
              Las categorias con productos no se pueden eliminar. Reasigna sus productos primero desde Inventario.
            </div>
          )}
        </div>
      </div>

      {/* Modal: nueva categoría */}
      <AddCategoriaModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        onCreada={() => { setShowAdd(false); refetch(); }}
      />

      {/* Modal: editar categoría */}
      <EditCategoriaModal
        categoria={editandoCategoria}
        onClose={() => setEditandoCategoria(null)}
        onGuardada={() => { setEditandoCategoria(null); refetch(); }}
      />

      {/* Modal: selector de ícono */}
      {editandoIcono && (
        <SelectorIconoModal
          iconoActual={editandoIcono.icono}
          onSeleccionar={(icono) => handleCambiarIcono(editandoIcono.id, icono)}
          onClose={() => setEditandoIcono(null)}
        />
      )}

      {/* Modal: confirmar eliminación con productos */}
      <Modal
        show={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        titulo="Eliminar categoria"
        icono="bi-exclamation-triangle"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger" onClick={() => ejecutarEliminar(confirmDelete?.id)}>
              Eliminar igual
            </button>
          </>
        }
      >
        <p className="mb-1">
          La categoria <strong>{confirmDelete?.nombre}</strong> tiene{' '}
          <strong>{confirmDelete?.productos_count} producto(s)</strong> asociados.
        </p>
        <p className="text-muted small mb-0">
          Si la eliminas, esos productos quedarán sin categoria. ¿Continuar?
        </p>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------

function AddCategoriaModal({ show, onClose, onCreada }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGlobal(null);
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio.' }); return; }
    setGuardando(true);
    setErrorGlobal(null);
    try {
      const { error } = await supabase.from('categorias').insert({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        icono: form.icono,
      });
      if (error) throw new Error(error.message);
      onCreada();
      handleClose();
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('categorias_nombre_key')) {
        setErrores({ nombre: 'Ya existe una categoria con ese nombre.' });
      } else {
        setErrorGlobal(err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  function handleClose() {
    setForm(FORM_VACIO);
    setErrores({});
    setErrorGlobal(null);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={guardando}>Cancelar</button>
      <button type="button" className="btn fp-btn-accent" onClick={handleGuardar} disabled={guardando}>
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className="bi bi-check-lg me-1" />Guardar</>}
      </button>
    </>
  );

  return (
    <>
      <Modal show={show} onClose={handleClose} titulo="Nueva categoria" icono="bi-tags" footer={footer}>
        {errorGlobal && (
          <div className="alert alert-danger py-2 mb-3">
            <i className="bi bi-exclamation-triangle me-2" />{errorGlobal}
          </div>
        )}
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
              placeholder="Ej: Herramientas, Pinturas..."
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              autoFocus
            />
            {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Descripcion</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Descripcion opcional..."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold d-block">Icono</label>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded border d-flex align-items-center justify-content-center bg-light"
                style={{ width: 48, height: 48 }}>
                <i className={`bi ${form.icono} fs-4 text-warning`} />
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowPicker(true)}>
                <i className="bi bi-grid me-1" />Elegir icono
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <SelectorIconoModal
        show={showPicker}
        iconoActual={form.icono}
        onSeleccionar={(icono) => { set('icono', icono); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

function SelectorIconoModal({ show = true, iconoActual, onSeleccionar, onClose }) {
  const [filtro, setFiltro] = useState('');

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return ICONOS_DISPONIBLES;
    return ICONOS_DISPONIBLES.filter((ic) => ic.replace('bi-', '').includes(q));
  }, [filtro]);

  return (
    <Modal
      show={show}
      onClose={onClose}
      titulo="Elegir icono"
      icono="bi-grid"
      size="lg"
    >
      <div className="mb-3">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Buscar icono... (ej: tool, lamp, pipe)"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          autoFocus
        />
      </div>
      <div
        className="d-flex flex-wrap gap-2 overflow-auto"
        style={{ maxHeight: 340 }}
      >
        {filtrados.map((ic) => (
          <button
            key={ic}
            type="button"
            title={ic.replace('bi-', '')}
            onClick={() => onSeleccionar(ic)}
            className={`btn btn-sm d-flex flex-column align-items-center justify-content-center gap-1 p-2 ${
              ic === iconoActual
                ? 'btn-warning'
                : 'btn-outline-secondary'
            }`}
            style={{ width: 64, height: 64, fontSize: '0.65rem' }}
          >
            <i className={`bi ${ic} fs-4`} />
            <span className="text-truncate w-100 text-center" style={{ fontSize: '0.6rem' }}>
              {ic.replace('bi-', '')}
            </span>
          </button>
        ))}
        {filtrados.length === 0 && (
          <p className="text-muted small">Sin resultados para &ldquo;{filtro}&rdquo;.</p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function EditCategoriaModal({ categoria, onClose, onGuardada }) {
  const show = !!categoria;
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!categoria) return;
    setForm({
      nombre:      categoria.nombre      ?? '',
      descripcion: categoria.descripcion ?? '',
      icono:       categoria.icono       ?? ICONO_DEFAULT,
    });
    setErrores({});
    setErrorGlobal(null);
  }, [categoria]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGlobal(null);
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio.' }); return; }
    setGuardando(true);
    setErrorGlobal(null);
    try {
      const { error } = await supabase
        .from('categorias')
        .update({
          nombre:      form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          icono:       form.icono,
        })
        .eq('id', categoria.id);
      if (error) throw new Error(error.message);
      onGuardada();
      handleClose();
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('categorias_nombre_key')) {
        setErrores({ nombre: 'Ya existe una categoria con ese nombre.' });
      } else {
        setErrorGlobal(err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  function handleClose() {
    setForm(FORM_VACIO);
    setErrores({});
    setErrorGlobal(null);
    setShowPicker(false);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={guardando}>
        Cancelar
      </button>
      <button type="button" className="btn fp-btn-accent" onClick={handleGuardar} disabled={guardando}>
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className="bi bi-check-lg me-1" />Guardar cambios</>}
      </button>
    </>
  );

  return (
    <>
      <Modal show={show} onClose={handleClose} titulo="Editar categoria" icono="bi-pencil-square" footer={footer}>
        {errorGlobal && (
          <div className="alert alert-danger py-2 mb-3">
            <i className="bi bi-exclamation-triangle me-2" />{errorGlobal}
          </div>
        )}
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              autoFocus
            />
            {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Descripcion</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Descripcion opcional..."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold d-block">Icono</label>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded border d-flex align-items-center justify-content-center bg-light"
                style={{ width: 48, height: 48 }}>
                <i className={`bi ${form.icono} fs-4 text-warning`} />
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowPicker(true)}>
                <i className="bi bi-grid me-1" />Elegir icono
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <SelectorIconoModal
        show={showPicker}
        iconoActual={form.icono}
        onSeleccionar={(icono) => { set('icono', icono); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}
