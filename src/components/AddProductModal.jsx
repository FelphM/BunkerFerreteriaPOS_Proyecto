/**
 * AddProductModal.jsx
 * ---------------------------------------------------------------------------
 * Modal para CREAR UN NUEVO PRODUCTO en el inventario desde el POS.
 *
 * El formulario crea en dos pasos (dentro de una sola transaccion visual):
 *   1. Registro en `productos`      (nombre, desc., categoria, proveedor, codigo).
 *   2. Primera variante/SKU en `producto_variantes` (medida, precio, stock).
 *   3. Movimiento `CARGA_INICIAL` en `movimientos_inventario`.
 *
 * Los selects de categoria y proveedor se cargan desde Supabase al montar.
 * El precio_venta se calcula en tiempo real: precio_compra × (1 + margen/100).
 *
 * TODO: Si el producto tiene varias medidas/variantes, el cajero debera
 * agregarlas desde la vista Inventario. Este modal es para el alta rapida.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCategorias, getProveedores, getConfigNumero } from '../data/queries';
import { formatCLP } from '../utils/format';
import AddProveedorModal from './AddProveedorModal';

// Unidades de venta disponibles.
const UNIDADES = ['unidad', 'pza', 'metro', 'kg', 'galon', 'saco', 'bolsa', 'set', 'litro', 'caja'];

// Estado inicial limpio del formulario.
const FORM_VACIO = {
  // Producto padre
  nombre: '',
  descripcion: '',
  categoria_id: '',
  proveedor_id: '',
  codigo_interno: '',
  // Variante / SKU
  variante_nombre: 'Estandar',
  unidad_venta: 'unidad',
  codigo_barras: '',
  precio_compra: '',
  margen_ganancia: '',
  stock_inicial: '0',
  stock_minimo: '5',
};

export default function AddProductModal({ show, onClose, onProductoCreado }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState(false);
  const primerInputRef = useRef(null);

  // Añadir categoría inline
  const [showNuevaCat, setShowNuevaCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  const [creandoCat, setCreandoCat] = useState(false);

  // Añadir proveedor (abre AddProveedorModal)
  const [showNuevoProv, setShowNuevoProv] = useState(false);

  // Carga catalogos al montar el modal por primera vez.
  useEffect(() => {
    getCategorias().then(setCategorias).catch(console.error);
    getProveedores().then(setProveedores).catch(console.error);
    getConfigNumero('margen_default').then((v) => {
      if (v) setForm((f) => ({ ...f, margen_ganancia: String(v) }));
    });
  }, []);

  // Foco al abrir y reseteo al cerrar.
  useEffect(() => {
    if (show) {
      setForm((prev) => ({ ...FORM_VACIO, margen_ganancia: prev.margen_ganancia }));
      setErrores({});
      setExito(false);
      setTimeout(() => primerInputRef.current?.focus(), 80);
    }
  }, [show]);

  // Cierre con ESC.
  useEffect(() => {
    if (!show) return undefined;
    const h = (e) => { if (e.key === 'Escape' && !guardando) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [show, onClose, guardando]);

  // Precio de venta calculado en tiempo real.
  const precioVenta = useMemo(() => {
    const compra = parseFloat(form.precio_compra) || 0;
    const margen = parseFloat(form.margen_ganancia) || 0;
    return Math.round(compra * (1 + margen / 100));
  }, [form.precio_compra, form.margen_ganancia]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpia el error del campo al escribir.
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }));
  };

  // Validacion del formulario.
  const validar = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
    if (!form.categoria_id) errs.categoria_id = 'Selecciona una categoria.';
    if (!form.variante_nombre.trim()) errs.variante_nombre = 'Indica la medida/tipo.';
    if (!form.unidad_venta) errs.unidad_venta = 'Selecciona la unidad de venta.';
    if (!form.precio_compra || parseFloat(form.precio_compra) <= 0)
      errs.precio_compra = 'Ingresa un precio de compra valido.';
    if (!form.margen_ganancia || parseFloat(form.margen_ganancia) < 0)
      errs.margen_ganancia = 'El margen debe ser 0 o mayor.';
    return errs;
  };

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
      setForm((f) => ({ ...f, categoria_id: data.id }));
      setNuevaCatNombre('');
      setShowNuevaCat(false);
    } catch (err) {
      console.error('Error creando categoria:', err.message);
    } finally {
      setCreandoCat(false);
    }
  }

  const handleGuardar = async (e) => {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length) { setErrores(errs); return; }

    setGuardando(true);
    setErrores({});

    try {
      // 1. Crear el producto padre.
      const { data: producto, error: errProd } = await supabase
        .from('productos')
        .insert({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          categoria_id: form.categoria_id || null,
          proveedor_id: form.proveedor_id || null,
          codigo_interno: form.codigo_interno.trim() || null,
          activo: true,
        })
        .select()
        .single();

      if (errProd) throw new Error(errProd.message);

      // 2. Crear la primera variante.
      const { data: variante, error: errVar } = await supabase
        .from('producto_variantes')
        .insert({
          producto_id: producto.id,
          variante_nombre: form.variante_nombre.trim(),
          unidad_venta: form.unidad_venta,
          codigo_barras: form.codigo_barras.trim() || null,
          precio_compra: parseFloat(form.precio_compra),
          margen_ganancia: parseFloat(form.margen_ganancia),
          stock_actual: parseFloat(form.stock_inicial) || 0,
          stock_minimo: parseFloat(form.stock_minimo) || 5,
          activo: true,
        })
        .select()
        .single();

      if (errVar) {
        await supabase.from('productos').delete().eq('id', producto.id);
        if (errVar.code === '23505') throw new Error('El código de barras ya está en uso por otra variante.');
        throw new Error(errVar.message);
      }

      // 3. Registrar el movimiento CARGA_INICIAL si hay stock inicial.
      const stockInicial = parseFloat(form.stock_inicial) || 0;
      if (stockInicial > 0) {
        await supabase.from('movimientos_inventario').insert({
          variante_id: variante.id,
          tipo_movimiento: 'CARGA_INICIAL',
          cantidad: stockInicial,
          stock_anterior: 0,
          stock_nuevo: stockInicial,
          observaciones: 'Alta de producto desde POS.',
        });
      }

      // Notifica al padre para refrescar el catalogo.
      setExito(true);
      onProductoCreado?.({ producto, variante });

      // Cierra el modal automaticamente tras 1.5s.
      setTimeout(() => { setExito(false); onClose(); }, 1500);

    } catch (err) {
      setErrores({ global: err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addProdModalTitle"
        onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onClose(); }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">

            {/* HEADER */}
            <div className="modal-header">
              <h5 className="modal-title" id="addProdModalTitle">
                <i className="bi bi-box-seam me-2 text-warning" />
                Añadir Producto al Inventario
              </h5>
              <button
                type="button"
                className="btn-close"
                disabled={guardando}
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>

            {/* BODY */}
            <form onSubmit={handleGuardar} noValidate>
              <div className="modal-body">

                {/* Error global */}
                {errores.global && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
                    <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
                    <span>{errores.global}</span>
                  </div>
                )}

                {/* Éxito */}
                {exito && (
                  <div className="alert alert-success d-flex align-items-center gap-2 py-2">
                    <i className="bi bi-check-circle-fill flex-shrink-0" />
                    Producto creado correctamente. Cerrando...
                  </div>
                )}

                {/* --------- SECCION 1: DATOS DEL PRODUCTO -------------- */}
                <div className="fw-bold text-uppercase text-secondary mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                  <i className="bi bi-box me-1" /> Datos del Producto
                </div>

                <div className="row g-3">
                  {/* Nombre */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Nombre del producto <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={primerInputRef}
                      type="text"
                      name="nombre"
                      className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
                      placeholder="Ej: Tornillo Autoperforante"
                      value={form.nombre}
                      onChange={handleChange}
                    />
                    {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
                  </div>

                  {/* Descripcion */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">Descripcion</label>
                    <textarea
                      name="descripcion"
                      className="form-control"
                      rows={2}
                      placeholder="Descripcion opcional del producto..."
                      value={form.descripcion}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Categoria */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Categoria <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex gap-2">
                      <select
                        name="categoria_id"
                        className={`form-select ${errores.categoria_id ? 'is-invalid' : ''}`}
                        value={form.categoria_id}
                        onChange={handleChange}
                      >
                        <option value="">— Seleccionar —</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-shrink-0"
                        title="Añadir nueva categoría"
                        onClick={() => setShowNuevaCat((v) => !v)}
                      >
                        <i className="bi bi-plus-lg" />
                      </button>
                    </div>
                    {errores.categoria_id && (
                      <div className="text-danger small mt-1">{errores.categoria_id}</div>
                    )}
                    {showNuevaCat && (
                      <div className="d-flex gap-2 mt-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Nombre de la nueva categoría..."
                          value={nuevaCatNombre}
                          autoFocus
                          onChange={(e) => setNuevaCatNombre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCrearCategoria(); }
                            if (e.key === 'Escape') { setShowNuevaCat(false); setNuevaCatNombre(''); }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          disabled={creandoCat || !nuevaCatNombre.trim()}
                          onClick={handleCrearCategoria}
                        >
                          {creandoCat
                            ? <span className="spinner-border spinner-border-sm" />
                            : <i className="bi bi-check-lg" />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => { setShowNuevaCat(false); setNuevaCatNombre(''); }}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Proveedor */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Proveedor</label>
                    <div className="d-flex gap-2">
                      <select
                        name="proveedor_id"
                        className="form-select"
                        value={form.proveedor_id}
                        onChange={handleChange}
                      >
                        <option value="">— Sin proveedor —</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-shrink-0"
                        title="Añadir nuevo proveedor"
                        onClick={() => setShowNuevoProv(true)}
                      >
                        <i className="bi bi-plus-lg" />
                      </button>
                    </div>
                  </div>

                  {/* Código interno */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Codigo interno (SKU)</label>
                    <input
                      type="text"
                      name="codigo_interno"
                      className="form-control"
                      placeholder="Ej: HER-010"
                      value={form.codigo_interno}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* --------- SECCION 2: VARIANTE / SKU ----------------- */}
                <hr className="my-4" />
                <div className="fw-bold text-uppercase text-secondary mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                  <i className="bi bi-upc me-1" /> Variante / SKU
                  <small className="text-muted ms-2 fw-normal normal-case">
                    (Las variantes adicionales se gestionan desde Inventario)
                  </small>
                </div>

                <div className="row g-3">
                  {/* Nombre de variante */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Medida / Tipo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="variante_nombre"
                      className={`form-control ${errores.variante_nombre ? 'is-invalid' : ''}`}
                      placeholder="Ej: 1/2 Pulgada, 6 oz, Estandar..."
                      value={form.variante_nombre}
                      onChange={handleChange}
                    />
                    {errores.variante_nombre && <div className="invalid-feedback">{errores.variante_nombre}</div>}
                  </div>

                  {/* Unidad de venta */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Unidad de venta <span className="text-danger">*</span>
                    </label>
                    <select
                      name="unidad_venta"
                      className={`form-select ${errores.unidad_venta ? 'is-invalid' : ''}`}
                      value={form.unidad_venta}
                      onChange={handleChange}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {errores.unidad_venta && <div className="invalid-feedback">{errores.unidad_venta}</div>}
                  </div>

                  {/* Código de barras */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Codigo de barras</label>
                    <input
                      type="text"
                      name="codigo_barras"
                      className="form-control"
                      placeholder="Escanear o escribir..."
                      value={form.codigo_barras}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Precio de compra */}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Precio compra (neto) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        name="precio_compra"
                        className={`form-control ${errores.precio_compra ? 'is-invalid' : ''}`}
                        min="0"
                        step="1"
                        placeholder="0"
                        value={form.precio_compra}
                        onChange={handleChange}
                      />
                      {errores.precio_compra && <div className="invalid-feedback">{errores.precio_compra}</div>}
                    </div>
                  </div>

                  {/* Margen */}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Margen ganancia (%) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="margen_ganancia"
                        className={`form-control ${errores.margen_ganancia ? 'is-invalid' : ''}`}
                        min="0"
                        step="0.1"
                        placeholder="60"
                        value={form.margen_ganancia}
                        onChange={handleChange}
                      />
                      <span className="input-group-text">%</span>
                      {errores.margen_ganancia && <div className="invalid-feedback">{errores.margen_ganancia}</div>}
                    </div>
                  </div>

                  {/* Precio de venta (calculado) */}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Precio de venta (IVA incl.)</label>
                    <div className="form-control bg-light fw-bold text-success fs-5 text-center">
                      {precioVenta > 0 ? formatCLP(precioVenta) : '—'}
                    </div>
                    <small className="text-secondary">Calculado automaticamente</small>
                  </div>

                  {/* Stock inicial */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Stock inicial</label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="stock_inicial"
                        className="form-control"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={form.stock_inicial}
                        onChange={handleChange}
                      />
                      <span className="input-group-text text-secondary">
                        {form.unidad_venta}
                      </span>
                    </div>
                    <small className="text-secondary">Se registra como CARGA_INICIAL en el historial de stock.</small>
                  </div>

                  {/* Stock mínimo */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Stock minimo (alerta)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="stock_minimo"
                        className="form-control"
                        min="0"
                        step="0.01"
                        placeholder="5"
                        value={form.stock_minimo}
                        onChange={handleChange}
                      />
                      <span className="input-group-text text-secondary">
                        {form.unidad_venta}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={guardando}
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-warning fw-bold px-4"
                  disabled={guardando || exito}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2" />
                      Crear Producto
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />

      {/* Modal para crear proveedor nuevo sin salir de este flujo */}
      <AddProveedorModal
        show={showNuevoProv}
        onClose={() => setShowNuevoProv(false)}
        onProveedorCreado={async (prov) => {
          setShowNuevoProv(false);
          const provs = await getProveedores();
          setProveedores(provs);
          if (prov?.id) setForm((f) => ({ ...f, proveedor_id: prov.id }));
        }}
      />
    </>
  );
}
