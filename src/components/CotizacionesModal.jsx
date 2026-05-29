/**
 * CotizacionesModal.jsx
 * ---------------------------------------------------------------------------
 * Modal para gestionar cotizaciones guardadas localmente.
 *
 * Las cotizaciones se persisten en localStorage bajo la clave 'fp_cotizaciones'.
 * Cada entrada tiene:
 *   { id, fecha, cliente, items, subtotal, iva, total, notas }
 *
 * Props:
 *   show     {boolean}  Visibilidad del modal.
 *   onClose  {Function} Callback de cierre.
 * ---------------------------------------------------------------------------
 */
import { useState } from 'react';
import Modal from './ui/Modal';
import { formatCLP } from '../utils/format';

const LS_KEY = 'fp_cotizaciones';

/** Lee las cotizaciones del localStorage ordenadas de mas reciente a mas antigua. */
export function leerCotizaciones() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Guarda una nueva cotizacion y retorna el array actualizado. */
export function guardarCotizacion(cotizacion) {
  const lista = leerCotizaciones();
  const nueva = { ...cotizacion, id: Date.now() };
  const actualizada = [nueva, ...lista];
  localStorage.setItem(LS_KEY, JSON.stringify(actualizada));
  return actualizada;
}

function eliminarCotizacion(id) {
  const lista = leerCotizaciones().filter((c) => c.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(lista));
  return lista;
}

// ---------------------------------------------------------------------------

export default function CotizacionesModal({ show, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [tick, setTick] = useState(0);

  // Releer del localStorage en cada render (tick fuerza re-render al eliminar).
  const lista = leerCotizaciones();

  function handleEliminar(id) {
    eliminarCotizacion(id);
    if (detalle?.id === id) setDetalle(null);
    setTick((n) => n + 1);
  }

  function handleClose() {
    setDetalle(null);
    onClose();
  }

  const footer = detalle ? (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={() => setDetalle(null)}
    >
      <i className="bi bi-arrow-left me-1" />
      Volver a la lista
    </button>
  ) : null;

  return (
    <Modal
      show={show}
      onClose={handleClose}
      titulo="Cotizaciones"
      icono="bi-file-earmark-text"
      size="lg"
      footer={footer}
    >
      {detalle ? (
        <DetalleView cotizacion={detalle} />
      ) : (
        <ListaView
          lista={lista}
          onVer={setDetalle}
          onEliminar={handleEliminar}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function ListaView({ lista, onVer, onEliminar }) {
  if (lista.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <i className="bi bi-file-earmark-x fs-1 d-block mb-2 opacity-50" />
        <p className="mb-0">No hay cotizaciones guardadas.</p>
        <small>Usa el boton &ldquo;Cotizar&rdquo; en el Punto de Venta.</small>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover table-sm align-middle mb-0">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th className="text-end">Total</th>
            <th className="text-center">Items</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lista.map((c, idx) => (
            <tr key={c.id}>
              <td className="text-muted">{idx + 1}</td>
              <td className="text-nowrap">
                {new Date(c.fecha).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td>{c.cliente || <span className="text-muted">—</span>}</td>
              <td className="text-end fw-semibold">{formatCLP(c.total)}</td>
              <td className="text-center">{c.items.length}</td>
              <td className="text-end text-nowrap">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary me-1"
                  onClick={() => onVer(c)}
                  title="Ver detalle"
                >
                  <i className="bi bi-eye" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onEliminar(c.id)}
                  title="Eliminar"
                >
                  <i className="bi bi-trash3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleView({ cotizacion }) {
  const { fecha, cliente, notas, items, subtotal, iva, total } = cotizacion;

  return (
    <div>
      <div className="row g-2 mb-3">
        <div className="col-sm-6">
          <small className="text-muted d-block">Fecha</small>
          <span>
            {new Date(fecha).toLocaleString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="col-sm-6">
          <small className="text-muted d-block">Cliente</small>
          <span>{cliente || '—'}</span>
        </div>
        {notas && (
          <div className="col-12">
            <small className="text-muted d-block">Notas</small>
            <span>{notas}</span>
          </div>
        )}
      </div>

      <div className="table-responsive mb-3">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-secondary">
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
                <td className="text-end">
                  {formatCLP(item.cantidad * item.precio_unitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex flex-column align-items-end gap-1">
        <div className="text-muted">
          Subtotal:{' '}
          <span className="text-body ms-2">{formatCLP(subtotal)}</span>
        </div>
        <div className="text-muted">
          IVA (19%):{' '}
          <span className="text-body ms-2">{formatCLP(iva)}</span>
        </div>
        <div className="fw-bold fs-5">
          Total:{' '}
          <span className="text-warning ms-2">{formatCLP(total)}</span>
        </div>
      </div>
    </div>
  );
}
