/**
 * TicketVentaModal.jsx
 * ---------------------------------------------------------------------------
 * Modal que se muestra tras completar una venta exitosa.
 * Incluye animacion de checkmark y ticket de venta con opcion de impresion.
 *
 * Props:
 *   ticketData  {object|null}  { venta, items, totals, metodoPago,
 *                                montoRecibido, ivaPct, nombreCliente }
 *   onClose     {Function}     Callback para cerrar (inicia nueva venta)
 * ---------------------------------------------------------------------------
 */
import { formatCLP, safeQty } from '../utils/format';

export default function TicketVentaModal({ ticketData, onClose }) {
  if (!ticketData) return null;

  const { venta, items, totals, metodoPago, montoRecibido, ivaPct, nombreCliente } = ticketData;

  const esEfectivo = metodoPago === 'Efectivo';
  const recibido = parseFloat(montoRecibido) || 0;
  const vuelto = esEfectivo && recibido > 0 ? recibido - totals.total : null;

  const fecha = venta?.creado_en ? new Date(venta.creado_en) : new Date();
  const fechaStr = fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const clienteMostrar = nombreCliente || venta?.nombre_cliente;
  const mostrarCliente = clienteMostrar && clienteMostrar !== 'Cliente General';

  function handleImprimir() {
    window.print();
  }

  return (
    <>
      <div
        className="modal fade show d-block fp-ticket-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 420 }}>
          <div className="modal-content">

            {/* ── Header animado ── */}
            <div className="modal-header border-0 pb-0 flex-column align-items-center text-center pt-4">
              <div className="fp-checkmark-wrap mb-3">
                <svg viewBox="0 0 52 52" className="fp-checkmark-svg" aria-hidden="true">
                  <circle cx="26" cy="26" r="25" fill="none" className="fp-checkmark-circle" />
                  <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" className="fp-checkmark-path" />
                </svg>
              </div>
              <h5 className="modal-title text-success fw-bold mb-1">¡Venta completada!</h5>
              {venta?.numero_venta && (
                <small className="text-secondary">
                  Boleta N° {String(venta.numero_venta).padStart(6, '0')}
                </small>
              )}
            </div>

            {/* ── Cuerpo: ticket ── */}
            <div className="modal-body pt-3 pb-2">

              {/* Esta div es el target de impresion */}
              <div className="fp-ticket-print">
                <div className="fp-ticket-paper">

                  {/* Encabezado de la tienda */}
                  <div className="fp-ticket-store-header">
                    <div className="fw-bold">BUNKER FERRETERIA</div>
                    <div>Boleta de Venta</div>
                    {venta?.numero_venta && (
                      <div>N° {String(venta.numero_venta).padStart(6, '0')}</div>
                    )}
                    <div>{fechaStr} — {horaStr}</div>
                    {mostrarCliente && (
                      <div className="mt-1">
                        Cliente: <strong>{clienteMostrar}</strong>
                      </div>
                    )}
                  </div>

                  <div className="fp-ticket-hr" />

                  {/* Lineas de producto */}
                  <table className="fp-ticket-table">
                    <colgroup>
                      <col style={{ width: '44%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Cant</th>
                        <th className="text-end">P.U.</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const qty = safeQty(item.cantidad);
                        const subtotal = item.precio_venta * qty;
                        return (
                          <tr key={i}>
                            <td>
                              <div className="fp-ticket-item-name">{item.nombre}</div>
                              {item.variante_nombre && item.variante_nombre !== 'Estandar' && (
                                <div className="fp-ticket-item-var">{item.variante_nombre}</div>
                              )}
                            </td>
                            <td className="text-center">{qty}</td>
                            <td className="text-end">{formatCLP(item.precio_venta)}</td>
                            <td className="text-end fw-semibold">{formatCLP(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="fp-ticket-hr" />

                  {/* Totales */}
                  <div className="fp-ticket-totales">
                    <div className="fp-ticket-row">
                      <span>Subtotal (neto)</span>
                      <span>{formatCLP(totals.neto)}</span>
                    </div>
                    <div className="fp-ticket-row">
                      <span>IVA ({ivaPct}%)</span>
                      <span>{formatCLP(totals.iva)}</span>
                    </div>
                    <div className="fp-ticket-row fp-ticket-total">
                      <span>TOTAL</span>
                      <span>{formatCLP(totals.total)}</span>
                    </div>
                  </div>

                  <div className="fp-ticket-hr" />

                  {/* Pago */}
                  <div className="fp-ticket-pago">
                    <div className="fp-ticket-row">
                      <span>Método de pago</span>
                      <span className="fw-semibold">{metodoPago}</span>
                    </div>
                    {esEfectivo && recibido > 0 && (
                      <>
                        <div className="fp-ticket-row">
                          <span>Recibido</span>
                          <span>{formatCLP(recibido)}</span>
                        </div>
                        {vuelto !== null && vuelto >= 0 && (
                          <div className="fp-ticket-row fp-ticket-vuelto">
                            <span>Vuelto</span>
                            <span>{formatCLP(vuelto)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="modal-footer justify-content-between gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleImprimir}
              >
                <i className="bi bi-printer me-1" />Imprimir
              </button>
              <button
                type="button"
                className="btn fp-btn-accent"
                onClick={onClose}
              >
                <i className="bi bi-check-lg me-1" />Aceptar
              </button>
            </div>

          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1049 }} />
    </>
  );
}
