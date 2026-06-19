/**
 * AjusteStockModal.jsx
 * ---------------------------------------------------------------------------
 * Modal para añadir o restar stock a una variante de producto.
 *
 * Tipos de movimiento disponibles (según constraint de BD):
 *   INGRESO_PROVEEDOR  → suma stock (entrada de mercancía; permite elegir proveedor)
 *   AJUSTE_ENTRADA     → suma stock (ajuste positivo manual: mercadería hallada, corrección)
 *   CARGA_INICIAL      → suma stock (carga inicial al dar de alta el producto)
 *   AJUSTE_MERMA       → resta stock (pérdida, daño, robo)
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProveedores } from '../data/queries';
import { formatStock } from '../utils/format';
import Modal from './ui/Modal';
import AddProveedorModal from './AddProveedorModal';

const TIPOS = [
  {
    value: 'INGRESO_PROVEEDOR',
    label: 'Ingreso de proveedor',
    descripcion: 'Entrada de mercancía recibida de un proveedor',
    signo: +1,
    color: 'success',
    icono: 'bi-box-arrow-in-down',
  },
  {
    value: 'AJUSTE_ENTRADA',
    label: 'Ajuste positivo',
    descripcion: 'Corrección al alza: mercadería hallada, error de conteo',
    signo: +1,
    color: 'primary',
    icono: 'bi-plus-circle',
  },
  {
    value: 'AJUSTE_MERMA',
    label: 'Ajuste por merma',
    descripcion: 'Pérdida, daño, vencimiento o robo de unidades',
    signo: -1,
    color: 'danger',
    icono: 'bi-dash-circle',
  },
  {
    value: 'CARGA_INICIAL',
    label: 'Carga inicial',
    descripcion: 'Solo para la primera carga de stock al crear el producto',
    signo: +1,
    color: 'secondary',
    icono: 'bi-box-seam',
  },
];

const FORM_VACIO = { tipo: 'INGRESO_PROVEEDOR', cantidad: '', observaciones: '' };

export default function AjusteStockModal({ variante, onClose, onAjustado }) {
  const show = !!variante;
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Proveedor
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [showNuevoProv, setShowNuevoProv] = useState(false);

  useEffect(() => {
    getProveedores().then(setProveedores).catch(console.error);
  }, []);

  // Resetear proveedor al cambiar de tipo
  useEffect(() => {
    if (form.tipo !== 'INGRESO_PROVEEDOR') setProveedorId('');
  }, [form.tipo]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError(null);
  }

  const tipoActual = TIPOS.find((t) => t.value === form.tipo) ?? TIPOS[0];
  const esIngreso = form.tipo === 'INGRESO_PROVEEDOR';

  const stockResultante = useMemo(() => {
    const qty = parseFloat(form.cantidad) || 0;
    if (!variante || qty <= 0) return variante?.stock_actual ?? 0;
    return (variante.stock_actual ?? 0) + tipoActual.signo * qty;
  }, [form.cantidad, variante, tipoActual]);

  async function handleGuardar() {
    const qty = parseFloat(form.cantidad) || 0;
    if (qty <= 0) { setError('La cantidad debe ser mayor a 0.'); return; }

    setGuardando(true);
    setError(null);
    try {
      const stockAnterior = variante.stock_actual ?? 0;
      const stockNuevo = stockAnterior + tipoActual.signo * qty;

      // Construir observaciones incluyendo proveedor si aplica
      let obs = form.observaciones.trim();
      if (esIngreso && proveedorId) {
        const prov = proveedores.find((p) => p.id === proveedorId);
        if (prov) {
          const provPart = `Proveedor: ${prov.nombre}`;
          obs = obs ? `${provPart}. ${obs}` : provPart;
        }
      }

      // 1. Registrar movimiento
      const { error: errMov } = await supabase.from('movimientos_inventario').insert({
        variante_id: variante.id,
        tipo_movimiento: form.tipo,
        cantidad: qty,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        observaciones: obs || null,
      });
      if (errMov) throw new Error(errMov.message);

      // 2. Actualizar stock en la variante
      const { error: errStock } = await supabase
        .from('producto_variantes')
        .update({ stock_actual: stockNuevo })
        .eq('id', variante.id);
      if (errStock) throw new Error(errStock.message);

      onAjustado?.();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function handleClose() {
    setForm(FORM_VACIO);
    setProveedorId('');
    setError(null);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={guardando}>
        Cancelar
      </button>
      <button
        type="button"
        className={`btn btn-${tipoActual.color}`}
        onClick={handleGuardar}
        disabled={guardando || !form.cantidad || parseFloat(form.cantidad) <= 0}
      >
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className={`bi ${tipoActual.icono} me-2`} />Aplicar ajuste</>}
      </button>
    </>
  );

  const esDerived = variante?.es_derivada ?? false;

  return (
    <>
      <Modal
        show={show}
        onClose={handleClose}
        titulo={variante ? `Ajustar stock — ${variante.producto_nombre}` : ''}
        icono="bi-boxes"
        footer={esDerived
          ? <button type="button" className="btn btn-secondary" onClick={handleClose}>Cerrar</button>
          : footer}
      >
        {variante && (
          <>
            {/* Nombre y stock actual */}
            <div
              className="d-flex align-items-center justify-content-between mb-4 p-3 rounded"
              style={{ background: 'var(--bs-tertiary-bg)' }}
            >
              <div>
                <div className="fw-semibold">{variante.producto_nombre}</div>
                <small className="text-secondary">
                  {variante.variante_nombre} · {variante.unidad_venta}
                </small>
              </div>
              <div className="text-end">
                <div className="text-secondary small">Stock actual</div>
                <div className="fw-bold fs-5">
                  {formatStock(variante.stock_actual)}{' '}
                  <small className="fw-normal text-secondary">{variante.unidad_venta}</small>
                </div>
              </div>
            </div>

            {/* Bloqueo para variantes derivadas */}
            {esDerived && (
              <div className="alert alert-info d-flex gap-3 align-items-start">
                <i className="bi bi-link-45deg fs-4 flex-shrink-0" />
                <div>
                  <div className="fw-semibold mb-1">Variante con trazabilidad cruzada</div>
                  <p className="mb-2 small">
                    Esta variante comparte stock con{' '}
                    <strong>&ldquo;{variante.variante_maestra_nombre}&rdquo;</strong>.
                    El stock que ves ({formatStock(variante.stock_actual)} {variante.unidad_venta}) se calcula
                    automáticamente a partir del stock de la variante maestra.
                  </p>
                  <p className="mb-0 small">
                    Para ajustar el stock, hazlo desde la variante{' '}
                    <strong>{variante.variante_maestra_nombre}</strong> usando el botón{' '}
                    <i className="bi bi-boxes" /> en la fila correspondiente.
                  </p>
                </div>
              </div>
            )}

            {/* Formulario — solo para variantes maestras */}
            {!esDerived && <>
            <div className="mb-3">
              <label className="form-label fw-semibold">Tipo de movimiento</label>
              <div className="d-flex flex-column gap-2">
                {TIPOS.map((t) => (
                  <label
                    key={t.value}
                    className={`d-flex align-items-start gap-3 p-3 rounded border ${
                      form.tipo === t.value
                        ? `border-${t.color} bg-${t.color} bg-opacity-10`
                        : 'border-secondary-subtle'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      className="form-check-input mt-1 flex-shrink-0"
                      name="tipo_movimiento"
                      value={t.value}
                      checked={form.tipo === t.value}
                      onChange={() => set('tipo', t.value)}
                    />
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${t.icono} text-${t.color}`} />
                        <span className="fw-semibold">{t.label}</span>
                        <span className={`badge bg-${t.color} ms-1`}>
                          {t.signo > 0 ? '+ suma' : '− resta'}
                        </span>
                      </div>
                      <small className="text-secondary">{t.descripcion}</small>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Selector de proveedor — solo para INGRESO_PROVEEDOR */}
            {esIngreso && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Proveedor <small className="fw-normal text-secondary">(opcional)</small>
                </label>
                <div className="d-flex gap-2">
                  <select
                    className="form-select"
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                  >
                    <option value="">— Sin especificar —</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-secondary flex-shrink-0"
                    title="Registrar nuevo proveedor"
                    onClick={() => setShowNuevoProv(true)}
                  >
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
                {proveedorId && (
                  <small className="text-success mt-1 d-block">
                    <i className="bi bi-check-circle me-1" />
                    Se registrará en las observaciones del movimiento.
                  </small>
                )}
              </div>
            )}

            {/* Cantidad */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Cantidad a {tipoActual.signo > 0 ? 'añadir' : 'restar'}
              </label>
              <div className="input-group">
                <span className={`input-group-text text-${tipoActual.color} fw-bold`}>
                  {tipoActual.signo > 0 ? '+' : '−'}
                </span>
                <input
                  type="number"
                  className="form-control"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  value={form.cantidad}
                  onChange={(e) => set('cantidad', e.target.value)}
                  autoFocus
                />
                <span className="input-group-text">{variante.unidad_venta}</span>
              </div>
            </div>

            {/* Stock resultante */}
            {form.cantidad && parseFloat(form.cantidad) > 0 && (
              <div
                className={`d-flex justify-content-between align-items-center p-3 rounded mb-3 ${
                  stockResultante < 0 ? 'bg-danger bg-opacity-10' : 'bg-success bg-opacity-10'
                }`}
              >
                <span className="fw-semibold">Stock resultante</span>
                <span className={`fw-bold fs-5 ${stockResultante < 0 ? 'text-danger' : 'text-success'}`}>
                  {formatStock(stockResultante)} {variante.unidad_venta}
                  {stockResultante < 0 && (
                    <small className="text-danger ms-2 fw-normal">(negativo)</small>
                  )}
                </span>
              </div>
            )}

            {/* Observaciones */}
            <div className="mb-1">
              <label className="form-label fw-semibold">
                Observaciones{' '}
                <small className="fw-normal text-secondary">(opcional)</small>
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder={
                  esIngreso && proveedorId
                    ? 'Ej: Factura N°1234, OC referencia...'
                    : 'Ej: Recepción factura N°1234, daño en transporte...'
                }
                value={form.observaciones}
                onChange={(e) => set('observaciones', e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mt-3 mb-0">
                <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            </>}
          </>
        )}
      </Modal>

      {/* Modal para crear nuevo proveedor desde este flujo */}
      <AddProveedorModal
        show={showNuevoProv}
        onClose={() => setShowNuevoProv(false)}
        onProveedorCreado={async (prov) => {
          setShowNuevoProv(false);
          const lista = await getProveedores();
          setProveedores(lista);
          if (prov?.id) setProveedorId(prov.id);
        }}
      />
    </>
  );
}
