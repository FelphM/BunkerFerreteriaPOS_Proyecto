/**
 * AddCompraModal.jsx
 * ---------------------------------------------------------------------------
 * Formulario para registrar una nueva orden de compra a proveedor.
 *
 * Notas de esquema DB:
 *   - compras.estado           → DEFAULT 'PENDIENTE' (no enviar en el insert)
 *   - detalle_compras.subtotal → columna GENERATED (no insertar manualmente)
 *   - Trigger en detalle_compras actualiza stock_actual automáticamente al
 *     insertar líneas (no hace falta código manual de stock aquí).
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProveedores, getVariantesInventario } from '../data/queries';
import { formatCLP, safeQty } from '../utils/format';
import Modal from './ui/Modal';

const FORM_VACIO = { proveedorId: '', observaciones: '' };

export default function AddCompraModal({ show, onClose, onCompraCreada }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [lineas, setLineas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const busqRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    getProveedores().then(setProveedores).catch(console.error);
    getVariantesInventario()
      .then((vars) => setVariantes(vars.filter((v) => v.activo && v.producto_activo)))
      .catch(console.error);
  }, [show]);

  useEffect(() => {
    if (!showDrop) return;
    const handler = (e) => {
      if (busqRef.current && !busqRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDrop]);

  function setField(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError(null);
  }

  const variantesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return variantes.slice(0, 8);
    return variantes
      .filter((v) =>
        v.producto_nombre.toLowerCase().includes(q) ||
        v.variante_nombre?.toLowerCase().includes(q) ||
        v.codigo_barras?.toLowerCase().includes(q) ||
        v.codigo_interno?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [variantes, busqueda]);

  function agregarVariante(v) {
    setLineas((prev) => {
      const existe = prev.find((l) => l.variante_id === v.id);
      if (existe) {
        return prev.map((l) =>
          l.variante_id === v.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          variante_id: v.id,
          producto_nombre: v.producto_nombre,
          variante_nombre: v.variante_nombre,
          unidad_venta: v.unidad_venta,
          cantidad: 1,
          precio_unitario: v.precio_compra ?? 0,
        },
      ];
    });
    setBusqueda('');
    setShowDrop(false);
  }

  function actualizarLinea(idx, campo, valor) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  function eliminarLinea(idx) {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = useMemo(
    () => lineas.reduce((s, l) => s + safeQty(l.cantidad) * (parseFloat(l.precio_unitario) || 0), 0),
    [lineas],
  );

  async function handleGuardar() {
    if (!form.proveedorId) { setError('Debes seleccionar un proveedor.'); return; }
    if (lineas.length === 0) { setError('Agrega al menos un producto.'); return; }

    setGuardando(true);
    setError(null);
    try {
      // 1. Cabecera — sin `estado` (usa DEFAULT de la BD = PENDIENTE)
      const { data: compra, error: errC } = await supabase
        .from('compras')
        .insert({
          proveedor_id: form.proveedorId,
          observaciones: form.observaciones.trim() || null,
          total: Math.round(total),
        })
        .select()
        .single();
      if (errC) throw new Error(errC.message);

      // 2. Líneas de detalle — sin `subtotal` (columna GENERATED)
      //    El trigger de la BD actualiza stock_actual automáticamente al insertar.
      const detalles = lineas.map((l) => ({
        compra_id: compra.id,
        variante_id: l.variante_id,
        cantidad: safeQty(l.cantidad),
        precio_unitario: parseFloat(l.precio_unitario) || 0,
      }));
      const { error: errD } = await supabase.from('detalle_compras').insert(detalles);
      if (errD) throw new Error(errD.message);

      onCompraCreada?.();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function handleClose() {
    setForm(FORM_VACIO);
    setLineas([]);
    setBusqueda('');
    setShowDrop(false);
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
        className="btn fp-btn-accent"
        onClick={handleGuardar}
        disabled={guardando || lineas.length === 0 || !form.proveedorId}
      >
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
          : <><i className="bi bi-floppy me-1" />Registrar compra</>}
      </button>
    </>
  );

  return (
    <Modal
      show={show}
      onClose={handleClose}
      titulo="Nueva compra"
      icono="bi-bag-plus"
      size="lg"
      footer={footer}
    >
      {/* ── Proveedor + Observaciones ── */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">
            Proveedor <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={form.proveedorId}
            onChange={(e) => setField('proveedorId', e.target.value)}
          >
            <option value="">— Seleccionar proveedor —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Observaciones</label>
          <input
            type="text"
            className="form-control"
            placeholder="N° de factura, nota de pedido..."
            value={form.observaciones}
            onChange={(e) => setField('observaciones', e.target.value)}
          />
        </div>
      </div>

      {/* ── Nota informativa ── */}
      <div className="alert alert-info d-flex gap-2 align-items-start py-2 mb-3">
        <i className="bi bi-boxes flex-shrink-0 mt-1" />
        <small>
          El stock de cada variante se actualiza automáticamente al registrar la compra.
          La compra queda en estado <strong>Pendiente</strong>; podés confirmarla desde el detalle.
        </small>
      </div>

      <hr className="my-3" />

      {/* ── Buscador de productos ── */}
      <div className="fw-semibold mb-2">
        <i className="bi bi-box-seam me-1" />Productos
      </div>
      <div className="position-relative mb-3" ref={busqRef}>
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre, variante o código..."
            value={busqueda}
            autoComplete="off"
            onChange={(e) => { setBusqueda(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
          />
        </div>
        {showDrop && (
          <div className="fp-cliente-dropdown" style={{ zIndex: 1060 }}>
            {variantesFiltradas.length > 0 ? (
              variantesFiltradas.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="fp-cliente-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => agregarVariante(v)}
                >
                  <div className="d-flex justify-content-between align-items-start w-100">
                    <div>
                      <span className="fw-semibold">{v.producto_nombre}</span>
                      {v.variante_nombre && v.variante_nombre !== 'Estandar' && (
                        <small className="text-secondary ms-1">· {v.variante_nombre}</small>
                      )}
                    </div>
                    <div className="text-end flex-shrink-0 ms-2">
                      {v.precio_compra > 0 && (
                        <small className="text-secondary">{formatCLP(v.precio_compra)}</small>
                      )}
                      <small className="text-secondary ms-2">
                        Stock: {v.stock_actual} {v.unidad_venta}
                      </small>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="fp-cliente-empty">Sin coincidencias</div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabla de líneas ── */}
      {lineas.length > 0 ? (
        <div className="table-responsive mb-2">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Producto</th>
                <th className="text-center" style={{ width: 90 }}>Cantidad</th>
                <th className="text-end" style={{ width: 130 }}>P. Unitario</th>
                <th className="text-end" style={{ width: 110 }}>Subtotal</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => {
                const qty = safeQty(l.cantidad);
                const pu = parseFloat(l.precio_unitario) || 0;
                return (
                  <tr key={i}>
                    <td>
                      <div className="fw-semibold">{l.producto_nombre}</div>
                      {l.variante_nombre && l.variante_nombre !== 'Estandar' && (
                        <small className="text-secondary">{l.variante_nombre} · {l.unidad_venta}</small>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center"
                        min="0.01"
                        step="0.01"
                        value={l.cantidad}
                        onChange={(e) => actualizarLinea(i, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control text-end"
                          min="0"
                          step="1"
                          value={l.precio_unitario}
                          onChange={(e) => actualizarLinea(i, 'precio_unitario', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="text-end fw-semibold text-nowrap">
                      {formatCLP(qty * pu)}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarLinea(i)}
                        title="Quitar"
                      >
                        <i className="bi bi-x" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="text-end fw-bold">TOTAL</td>
                <td className="text-end fw-bold fs-6 text-nowrap">{formatCLP(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div
          className="text-center text-secondary py-3 rounded"
          style={{ border: '1px dashed var(--bs-border-color)' }}
        >
          <i className="bi bi-box-seam fs-4 d-block mb-1 opacity-50" />
          <small>Buscá y agregá productos usando el campo de arriba.</small>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mt-3 mb-0">
          <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </Modal>
  );
}
