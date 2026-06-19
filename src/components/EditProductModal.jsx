/**
 * EditProductModal.jsx
 * ---------------------------------------------------------------------------
 * Formulario para editar un producto/variante.
 * Carga los datos completos desde Supabase al abrir. No modifica stock_actual.
 *
 * Props:
 *   item       {object}   Objeto con id (variante) e id_producto
 *   onClose    {Function}
 *   onGuardado {Function} Callback para refrescar el catalogo
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCategorias, getProveedores } from '../data/queries';
import { formatCLP } from '../utils/format';
import Modal from './ui/Modal';
import AddProveedorModal from './AddProveedorModal';
import AddVarianteModal from './AddVarianteModal';

const UNIDADES = ['unidad', 'pza', 'metro', 'kg', 'galon', 'saco', 'bolsa', 'set', 'litro', 'caja'];

export default function EditProductModal({ item, onClose, onGuardado }) {
  const show = !!item;

  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [exito, setExito] = useState(false);

  // Añadir categoría inline
  const [showNuevaCat, setShowNuevaCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  const [creandoCat, setCreandoCat] = useState(false);

  // Añadir proveedor via modal
  const [showNuevoProv, setShowNuevoProv] = useState(false);

  // Agregar variante al producto
  const [variantesAll, setVariantesAll] = useState([]);
  const [showAddVariante, setShowAddVariante] = useState(false);

  const [prod, setProd] = useState({
    nombre: '', descripcion: '', categoria_id: '', proveedor_id: '', codigo_interno: '',
  });

  const [vari, setVari] = useState({
    variante_nombre: '', unidad_venta: 'unidad', codigo_barras: '',
    precio_compra: '', margen_ganancia: '', stock_minimo: '',
  });

  const precioVenta = useMemo(() => {
    const c = parseFloat(vari.precio_compra) || 0;
    const m = parseFloat(vari.margen_ganancia) || 0;
    return Math.round(c * (1 + m / 100));
  }, [vari.precio_compra, vari.margen_ganancia]);

  useEffect(() => {
    if (!item) return;
    setCargando(true);
    setErrorGlobal(null);
    setExito(false);
    setShowNuevaCat(false);
    setNuevaCatNombre('');

    Promise.all([
      supabase.from('productos').select('*').eq('id', item.id_producto).single(),
      supabase.from('producto_variantes').select('*').eq('id', item.id).single(),
      getCategorias(),
      getProveedores(),
      supabase.from('producto_variantes')
        .select('id, variante_nombre, unidad_venta, variante_ref_id')
        .eq('producto_id', item.id_producto)
        .eq('activo', true),
    ])
      .then(([{ data: p, error: eP }, { data: v, error: eV }, cats, provs, { data: vars }]) => {
        if (eP) throw new Error(eP.message);
        if (eV) throw new Error(eV.message);
        setCategorias(cats);
        setProveedores(provs);
        setVariantesAll(vars ?? []);
        setProd({
          nombre:        p.nombre         ?? '',
          descripcion:   p.descripcion    ?? '',
          categoria_id:  p.categoria_id   ?? '',
          proveedor_id:  p.proveedor_id   ?? '',
          codigo_interno: p.codigo_interno ?? '',
        });
        setVari({
          variante_nombre: v.variante_nombre ?? '',
          unidad_venta:    v.unidad_venta    ?? 'unidad',
          codigo_barras:   v.codigo_barras   ?? '',
          precio_compra:   String(v.precio_compra   ?? ''),
          margen_ganancia: String(v.margen_ganancia ?? ''),
          stock_minimo:    String(v.stock_minimo    ?? ''),
        });
      })
      .catch((err) => setErrorGlobal(err.message))
      .finally(() => setCargando(false));
  }, [item]);

  async function handleCrearCategoria() {
    if (!nuevaCatNombre.trim()) return;
    setCreandoCat(true);
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert({ nombre: nuevaCatNombre.trim() })
        .select()
        .single();
      if (error) throw error;
      const cats = await getCategorias();
      setCategorias(cats);
      setProd((p) => ({ ...p, categoria_id: data.id }));
      setNuevaCatNombre('');
      setShowNuevaCat(false);
    } catch (err) {
      console.error('Error creando categoria:', err.message);
    } finally {
      setCreandoCat(false);
    }
  }

  async function handleGuardar() {
    if (!prod.nombre.trim()) { setErrorGlobal('El nombre es obligatorio.'); return; }
    setGuardando(true);
    setErrorGlobal(null);
    try {
      const { error: eP } = await supabase
        .from('productos')
        .update({
          nombre:         prod.nombre.trim(),
          descripcion:    prod.descripcion.trim() || null,
          categoria_id:   prod.categoria_id       || null,
          proveedor_id:   prod.proveedor_id       || null,
          codigo_interno: prod.codigo_interno.trim() || null,
        })
        .eq('id', item.id_producto);
      if (eP) throw new Error(eP.message);

      const { error: eV } = await supabase
        .from('producto_variantes')
        .update({
          variante_nombre: vari.variante_nombre.trim() || 'Estandar',
          unidad_venta:    vari.unidad_venta,
          codigo_barras:   vari.codigo_barras.trim() || null,
          precio_compra:   parseFloat(vari.precio_compra)   || 0,
          margen_ganancia: parseFloat(vari.margen_ganancia) || 0,
          stock_minimo:    parseFloat(vari.stock_minimo)    || 0,
        })
        .eq('id', item.id);
      if (eV) throw new Error(eV.message);

      setExito(true);
      onGuardado?.();
      setTimeout(() => { setExito(false); onClose(); }, 1200);
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={() => setShowAddVariante(true)}
        disabled={guardando || cargando}
        title="Agregar otra variante a este producto (ej: venta por unidad y por caja)"
      >
        <i className="bi bi-upc me-1" />Agregar variante
      </button>
      <button
        type="button"
        className="btn fp-btn-accent"
        onClick={handleGuardar}
        disabled={guardando || cargando || exito}
      >
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className="bi bi-check-lg me-1" />Guardar cambios</>}
      </button>
    </>
  );

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        titulo="Editar producto"
        icono="bi-pencil-square"
        size="lg"
        footer={!exito ? footer : null}
      >
        {exito && (
          <div className="alert alert-success d-flex align-items-center gap-2 py-2">
            <i className="bi bi-check-circle-fill" />Cambios guardados. Cerrando...
          </div>
        )}

        {errorGlobal && (
          <div className="alert alert-danger py-2 mb-3">
            <i className="bi bi-exclamation-triangle me-2" />{errorGlobal}
          </div>
        )}

        {cargando ? (
          <div className="text-center py-4 text-secondary">
            <span className="spinner-border spinner-border-sm me-2" />Cargando datos...
          </div>
        ) : (
          <>
            <div className="fw-bold text-uppercase text-secondary mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              <i className="bi bi-box me-1" />Datos del producto
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
                <input type="text" className="form-control"
                  value={prod.nombre} onChange={(e) => setProd((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Descripcion</label>
                <textarea className="form-control" rows={2}
                  value={prod.descripcion} onChange={(e) => setProd((p) => ({ ...p, descripcion: e.target.value }))} />
              </div>

              {/* Categoria con quick-add */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Categoria</label>
                <div className="d-flex gap-2">
                  <select className="form-select" value={prod.categoria_id}
                    onChange={(e) => setProd((p) => ({ ...p, categoria_id: e.target.value }))}>
                    <option value="">— Sin categoria —</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button type="button" className="btn btn-outline-secondary flex-shrink-0"
                    title="Añadir nueva categoría" onClick={() => setShowNuevaCat((v) => !v)}>
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
                {showNuevaCat && (
                  <div className="d-flex gap-2 mt-2">
                    <input type="text" className="form-control form-control-sm"
                      placeholder="Nombre de la nueva categoría..."
                      value={nuevaCatNombre} autoFocus
                      onChange={(e) => setNuevaCatNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCrearCategoria(); }
                        if (e.key === 'Escape') { setShowNuevaCat(false); setNuevaCatNombre(''); }
                      }}
                    />
                    <button type="button" className="btn btn-sm btn-success"
                      disabled={creandoCat || !nuevaCatNombre.trim()} onClick={handleCrearCategoria}>
                      {creandoCat
                        ? <span className="spinner-border spinner-border-sm" />
                        : <i className="bi bi-check-lg" />}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => { setShowNuevaCat(false); setNuevaCatNombre(''); }}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                )}
              </div>

              {/* Proveedor con quick-add */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Proveedor</label>
                <div className="d-flex gap-2">
                  <select className="form-select" value={prod.proveedor_id}
                    onChange={(e) => setProd((p) => ({ ...p, proveedor_id: e.target.value }))}>
                    <option value="">— Sin proveedor —</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button type="button" className="btn btn-outline-secondary flex-shrink-0"
                    title="Añadir nuevo proveedor" onClick={() => setShowNuevoProv(true)}>
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Codigo interno (SKU)</label>
                <input type="text" className="form-control"
                  value={prod.codigo_interno} onChange={(e) => setProd((p) => ({ ...p, codigo_interno: e.target.value }))} />
              </div>
            </div>

            <hr className="my-3" />
            <div className="fw-bold text-uppercase text-secondary mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              <i className="bi bi-upc me-1" />Variante / SKU
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Medida / Tipo</label>
                <input type="text" className="form-control"
                  value={vari.variante_nombre} onChange={(e) => setVari((v) => ({ ...v, variante_nombre: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Unidad de venta</label>
                <select className="form-select" value={vari.unidad_venta}
                  onChange={(e) => setVari((v) => ({ ...v, unidad_venta: e.target.value }))}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Codigo de barras</label>
                <input type="text" className="form-control"
                  value={vari.codigo_barras} onChange={(e) => setVari((v) => ({ ...v, codigo_barras: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Stock minimo (alerta)</label>
                <input type="number" className="form-control" min="0"
                  value={vari.stock_minimo} onChange={(e) => setVari((v) => ({ ...v, stock_minimo: e.target.value }))} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Precio compra (neto)</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input type="number" className="form-control" min="0"
                    value={vari.precio_compra} onChange={(e) => setVari((v) => ({ ...v, precio_compra: e.target.value }))} />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Margen (%)</label>
                <div className="input-group">
                  <input type="number" className="form-control" min="0"
                    value={vari.margen_ganancia} onChange={(e) => setVari((v) => ({ ...v, margen_ganancia: e.target.value }))} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Precio de venta</label>
                <div className="form-control bg-light fw-bold text-success text-center">
                  {precioVenta > 0 ? formatCLP(precioVenta) : '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      <AddProveedorModal
        show={showNuevoProv}
        onClose={() => setShowNuevoProv(false)}
        onProveedorCreado={async (prov) => {
          setShowNuevoProv(false);
          const provs = await getProveedores();
          setProveedores(provs);
          if (prov?.id) setProd((p) => ({ ...p, proveedor_id: prov.id }));
        }}
      />

      <AddVarianteModal
        productoId={showAddVariante ? item?.id_producto : null}
        productoNombre={prod.nombre}
        variantesExistentes={variantesAll}
        onClose={() => setShowAddVariante(false)}
        onCreada={() => {
          setShowAddVariante(false);
          onGuardado?.();
        }}
      />
    </>
  );
}
