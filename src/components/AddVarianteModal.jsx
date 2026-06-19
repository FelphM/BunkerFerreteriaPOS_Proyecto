/**
 * AddVarianteModal.jsx
 * ---------------------------------------------------------------------------
 * Agrega una nueva variante a un producto existente.
 * Soporta trazabilidad cruzada: la variante puede ser "derivada" de otra,
 * compartiendo el mismo stock físico mediante un factor de conversión.
 *
 * Ejemplo: producto "Arena" con variante maestra "Por saco" y variante
 * derivada "Por kg" con factor 50 (1 saco = 50 kg).
 *
 * Props:
 *   productoId          {string|null}  — null = modal cerrado
 *   productoNombre      {string}
 *   variantesExistentes {Array}        — [{id, variante_nombre, unidad_venta, variante_ref_id}]
 *   onClose             {Function}
 *   onCreada            {Function}     — llamado después de insertar con éxito
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatCLP } from '../utils/format';
import Modal from './ui/Modal';

const UNIDADES = ['unidad', 'pza', 'metro', 'kg', 'galon', 'saco', 'bolsa', 'set', 'litro', 'caja'];

const FORM_VACIO = {
  variante_nombre: '',
  unidad_venta: 'unidad',
  codigo_barras: '',
  precio_compra: '',
  margen_ganancia: '60',
  stock_minimo: '5',
  es_derivada: false,
  variante_ref_id: '',
  factor_conversion: '',
};

export default function AddVarianteModal({
  productoId,
  productoNombre,
  variantesExistentes = [],
  onClose,
  onCreada,
}) {
  const show = !!productoId;
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      setForm(FORM_VACIO);
      setError(null);
    }
  }, [show, productoId]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError(null);
  }

  const precioVenta = useMemo(() => {
    const c = parseFloat(form.precio_compra) || 0;
    const m = parseFloat(form.margen_ganancia) || 0;
    return Math.round(c * (1 + m / 100));
  }, [form.precio_compra, form.margen_ganancia]);

  // Solo variantes maestras (sin variante_ref_id) pueden ser base de una derivada
  const posiblesBases = variantesExistentes.filter((v) => !v.variante_ref_id);
  const maestraSeleccionada = posiblesBases.find((v) => v.id === form.variante_ref_id);

  async function handleGuardar() {
    if (!form.variante_nombre.trim()) {
      setError('Ingresa un nombre para la variante.');
      return;
    }
    if (form.es_derivada) {
      if (!form.variante_ref_id) {
        setError('Selecciona la variante base.');
        return;
      }
      if (!form.factor_conversion || parseFloat(form.factor_conversion) <= 0) {
        setError('El factor de conversión debe ser mayor a 0.');
        return;
      }
    }

    setGuardando(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('producto_variantes').insert({
        producto_id:      productoId,
        variante_nombre:  form.variante_nombre.trim(),
        unidad_venta:     form.unidad_venta,
        codigo_barras:    form.codigo_barras.trim() || null,
        precio_compra:    parseFloat(form.precio_compra)    || 0,
        margen_ganancia:  parseFloat(form.margen_ganancia)  || 60,
        stock_actual:     0,
        stock_minimo:     parseFloat(form.stock_minimo)     || 0,
        activo:           true,
        variante_ref_id:  form.es_derivada ? form.variante_ref_id   : null,
        factor_conversion: form.es_derivada ? parseFloat(form.factor_conversion) : null,
      });
      if (err) {
        if (err.code === '23505') throw new Error('El código de barras ya está en uso por otra variante.');
        throw new Error(err.message);
      }
      onCreada?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>
        Cancelar
      </button>
      <button type="button" className="btn fp-btn-accent" onClick={handleGuardar} disabled={guardando}>
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className="bi bi-plus-lg me-1" />Agregar variante</>}
      </button>
    </>
  );

  return (
    <Modal
      show={show}
      onClose={onClose}
      titulo={`Nueva variante — ${productoNombre || ''}`}
      icono="bi-upc"
      size="lg"
      level={2}
      footer={footer}
    >
      {/* Variantes actuales del producto */}
      {variantesExistentes.length > 0 && (
        <div className="mb-4 p-3 rounded" style={{ background: 'var(--bs-tertiary-bg)' }}>
          <div className="small fw-semibold text-secondary mb-2">Variantes actuales</div>
          <div className="d-flex flex-wrap gap-2">
            {variantesExistentes.map((v) => (
              <span
                key={v.id}
                className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1"
              >
                {v.variante_ref_id && <i className="bi bi-link-45deg me-1" />}
                {v.variante_nombre} · {v.unidad_venta}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">
            Nombre de la variante <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Por kilogramo, Caja x100, Metro lineal..."
            value={form.variante_nombre}
            onChange={(e) => set('variante_nombre', e.target.value)}
            autoFocus
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Unidad de venta</label>
          <select
            className="form-select"
            value={form.unidad_venta}
            onChange={(e) => set('unidad_venta', e.target.value)}
          >
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Código de barras</label>
          <input
            type="text"
            className="form-control"
            placeholder="Opcional"
            value={form.codigo_barras}
            onChange={(e) => set('codigo_barras', e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Stock mínimo (alerta)</label>
          <input
            type="number"
            className="form-control"
            min="0"
            value={form.stock_minimo}
            onChange={(e) => set('stock_minimo', e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Precio compra</label>
          <div className="input-group">
            <span className="input-group-text">$</span>
            <input
              type="number"
              className="form-control"
              min="0"
              value={form.precio_compra}
              onChange={(e) => set('precio_compra', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Margen (%)</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              min="0"
              value={form.margen_ganancia}
              onChange={(e) => set('margen_ganancia', e.target.value)}
            />
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

      {/* Trazabilidad cruzada — solo si hay variantes maestras disponibles */}
      {posiblesBases.length > 0 && (
        <div className="mt-4 border rounded p-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="esDerived"
              checked={form.es_derivada}
              onChange={(e) => set('es_derivada', e.target.checked)}
            />
            <label className="form-check-label fw-semibold" htmlFor="esDerived">
              <i className="bi bi-link-45deg me-1" />
              Trazabilidad cruzada — stock compartido con otra variante
            </label>
          </div>
          <small className="text-secondary d-block mt-1">
            Activa esto si esta variante comparte el mismo stock físico que otra
            (ej: vender por kg y por saco del mismo material). El stock se descuenta
            automáticamente de la variante base al realizar ventas.
          </small>

          {form.es_derivada && (
            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Variante base <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.variante_ref_id}
                  onChange={(e) => set('variante_ref_id', e.target.value)}
                >
                  <option value="">Seleccionar variante base...</option>
                  {posiblesBases.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variante_nombre} ({v.unidad_venta})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Factor de conversión <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text text-secondary" style={{ fontSize: '0.85rem' }}>
                    1&nbsp;{maestraSeleccionada?.unidad_venta || '(base)'}&nbsp;=
                  </span>
                  <input
                    type="number"
                    className="form-control"
                    min="0.0001"
                    step="0.01"
                    placeholder="50"
                    value={form.factor_conversion}
                    onChange={(e) => set('factor_conversion', e.target.value)}
                  />
                  <span className="input-group-text">{form.unidad_venta}</span>
                </div>
                {form.factor_conversion && parseFloat(form.factor_conversion) > 0 && maestraSeleccionada && (
                  <small className="text-success mt-1 d-block">
                    <i className="bi bi-check-circle me-1" />
                    1&nbsp;{maestraSeleccionada.unidad_venta}&nbsp;=&nbsp;
                    {form.factor_conversion}&nbsp;{form.unidad_venta}.
                    {' '}Ventas de esta variante descuentan de &ldquo;{maestraSeleccionada.variante_nombre}&rdquo;.
                  </small>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
