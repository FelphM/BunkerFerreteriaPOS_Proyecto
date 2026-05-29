/**
 * CotizarPreviewModal.jsx
 * ---------------------------------------------------------------------------
 * Modal de previsualización de cotización antes de guardar.
 * Muestra el detalle completo, permite imprimir y confirmar o cancelar.
 *
 * Props:
 *   show        {boolean}
 *   cotizacion  {object}   { fecha, cliente, notas, items, subtotal, iva, total }
 *   onGuardar   {Function} Callback para confirmar y guardar
 *   onCancelar  {Function} Callback para descartar
 * ---------------------------------------------------------------------------
 */
import Modal from './ui/Modal';
import { formatCLP } from '../utils/format';
import { imprimirCotizacion } from '../utils/print';

export default function CotizarPreviewModal({ show, cotizacion, onGuardar, onCancelar }) {
  if (!cotizacion) return null;

  const { fecha, cliente, notas, items, subtotal, iva, total } = cotizacion;

  const footer = (
    <div className="d-flex gap-2 w-100 justify-content-between">
      <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
        <i className="bi bi-x-lg me-1" />Cancelar
      </button>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-outline-dark"
          onClick={() => imprimirCotizacion(cotizacion)}
        >
          <i className="bi bi-printer me-1" />Imprimir
        </button>
        <button type="button" className="btn fp-btn-accent" onClick={onGuardar}>
          <i className="bi bi-floppy me-1" />Guardar cotización
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      show={show}
      onClose={onCancelar}
      titulo="Vista previa de cotización"
      icono="bi-file-earmark-text"
      size="lg"
      footer={footer}
    >
      {/* Encabezado */}
      <div className="row g-2 mb-4 pb-3 border-bottom">
        <div className="col-sm-4">
          <small className="text-muted d-block mb-1">Fecha</small>
          <span>
            {new Date(fecha).toLocaleString('es-CL', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
        <div className="col-sm-4">
          <small className="text-muted d-block mb-1">Cliente</small>
          <span className="fw-semibold">{cliente || '—'}</span>
        </div>
        {notas && (
          <div className="col-sm-4">
            <small className="text-muted d-block mb-1">Notas</small>
            <span>{notas}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="table-responsive mb-3">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th className="text-center">Cant.</th>
              <th className="text-end">P. Unit.</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i}>
                <td>
                  <div className="fw-semibold">{item.nombre}</div>
                  {item.sku && <small className="text-muted">{item.sku}</small>}
                </td>
                <td className="text-center">{item.cantidad}</td>
                <td className="text-end">{formatCLP(item.precio_unitario)}</td>
                <td className="text-end fw-semibold">
                  {formatCLP(item.cantidad * item.precio_unitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="d-flex flex-column align-items-end gap-1 pt-2 border-top">
        <div className="text-muted small">
          Subtotal (neto): <span className="text-body ms-2 fw-semibold">{formatCLP(subtotal)}</span>
        </div>
        <div className="text-muted small">
          IVA (19%): <span className="text-body ms-2 fw-semibold">{formatCLP(iva)}</span>
        </div>
        <div className="fw-bold fs-4 mt-1">
          Total: <span className="text-warning ms-2">{formatCLP(total)}</span>
        </div>
      </div>
    </Modal>
  );
}
