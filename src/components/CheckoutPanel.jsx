/**
 * CheckoutPanel.jsx
 * ---------------------------------------------------------------------------
 * PANEL DERECHO: Cobro de la venta.
 *
 *   - Resumen destacado: Subtotal (neto), IVA y TOTAL.
 *   - Metodo de pago: Efectivo / Tarjeta / Transferencia.
 *   - Monto recibido + montos rapidos + calculo de vuelto (solo efectivo).
 *   - Cliente y notas de la venta.
 *   - Acciones: COBRAR (finaliza), APARTAR (deja en espera), COTIZAR.
 *
 * Componente controlado: el estado del formulario de cobro vive en PosPage.
 * ---------------------------------------------------------------------------
 */
import { formatCLP, safeQty } from '../utils/format';

// Metodos de pago. En produccion pueden venir de la tabla `configuracion`.
// Los valores deben coincidir exactamente con el CHECK constraint de la tabla `ventas`.
const METODOS_PAGO = [
  { value: 'Efectivo', label: 'Efectivo', icono: 'bi-cash-coin' },
  { value: 'Transbank', label: 'Tarjeta', icono: 'bi-credit-card' },
  { value: 'Transferencia', label: 'Transfer.', icono: 'bi-bank' },
];

// Montos rapidos sugeridos (CLP).
const MONTOS_RAPIDOS = [1000, 2000, 5000, 10000, 20000];

export default function CheckoutPanel({
  totals,
  ivaPct,
  metodoPago,
  onChangeMetodoPago,
  montoRecibido,
  onChangeMontoRecibido,
  cliente,
  onChangeCliente,
  notas,
  onChangeNotas,
  hayItems,
  errorVenta,
  onCobrar,
  onApartar,
  onCotizar,
}) {
  const esEfectivo = metodoPago === 'Efectivo';
  const recibido = safeQty(montoRecibido);
  const vuelto = recibido - totals.total;
  // En efectivo no se puede cobrar si el monto recibido no alcanza.
  const faltaMonto = esEfectivo && recibido < totals.total;

  return (
    <aside className="fp-checkout d-flex flex-column h-100">
      {/* ------------- RESUMEN (caja naranja destacada) ---------------- */}
      <div className="fp-totals-box">
        <div className="d-flex justify-content-between">
          <span>Subtotal</span>
          <span className="text-nowrap">{formatCLP(totals.neto)}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span>IVA ({ivaPct}%)</span>
          <span className="text-nowrap">{formatCLP(totals.iva)}</span>
        </div>
        <hr className="my-2 border-light opacity-50" />
        <div className="d-flex justify-content-between align-items-center">
          <span className="fs-5 fw-bold">TOTAL</span>
          <span className="fp-total-amount text-nowrap">
            {formatCLP(totals.total)}
          </span>
        </div>
      </div>

      {/* Cuerpo desplazable: si el contenido no cabe, scrollea aqui y
          deja los botones de accion siempre visibles abajo. */}
      <div className="fp-checkout-body flex-grow-1 overflow-auto">
        {/* --------------------- METODO DE PAGO ------------------------ */}
        <label className="fp-field-label">Metodo de pago</label>
        <div className="fp-pay-methods">
          {METODOS_PAGO.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`fp-pay-method ${
                metodoPago === m.value ? 'active' : ''
              }`}
              onClick={() => onChangeMetodoPago(m.value)}
            >
              <i className={`bi ${m.icono} fs-5`} />
              <span className="small">{m.label}</span>
            </button>
          ))}
        </div>

        {/* ------------------- MONTO RECIBIDO -------------------------- */}
        {/* Relevante para pago en efectivo (calculo de vuelto). */}
        {esEfectivo && (
          <>
            <label className="fp-field-label" htmlFor="montoRecibido">
              Monto recibido
            </label>
            <div className="input-group input-group-lg">
              <span className="input-group-text">$</span>
              <input
                id="montoRecibido"
                type="number"
                className="form-control text-end"
                min="0"
                step="1"
                placeholder="0"
                value={montoRecibido}
                onChange={(e) => onChangeMontoRecibido(e.target.value)}
              />
            </div>

            {/* Montos rapidos + "Exacto" (iguala el total). */}
            <div className="fp-quick-amounts">
              {MONTOS_RAPIDOS.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onChangeMontoRecibido(String(monto))}
                >
                  {formatCLP(monto)}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline-warning fw-semibold"
                onClick={() => onChangeMontoRecibido(String(totals.total))}
              >
                Exacto
              </button>
            </div>

            {/* Vuelto: solo cuando el monto recibido alcanza. */}
            {hayItems && recibido > 0 && (
              <div
                className={`fp-vuelto ${vuelto >= 0 ? 'ok' : 'falta'}`}
              >
                <span>{vuelto >= 0 ? 'Vuelto' : 'Falta'}</span>
                <strong>{formatCLP(Math.abs(vuelto))}</strong>
              </div>
            )}
          </>
        )}

        {/* ---------------------- CLIENTE ------------------------------ */}
        <label className="fp-field-label" htmlFor="cliente">
          Cliente
        </label>
        <div className="input-group">
          <input
            id="cliente"
            type="text"
            className="form-control"
            placeholder="Publico en general"
            value={cliente}
            onChange={(e) => onChangeCliente(e.target.value)}
          />
          {/* TODO: Supabase - abrir buscador/selector de la tabla `clientes`. */}
          <button type="button" className="btn btn-outline-secondary">
            <i className="bi bi-search" />
          </button>
        </div>

        {/* ----------------------- NOTAS ------------------------------- */}
        <label className="fp-field-label" htmlFor="notas">
          Notas
        </label>
        <textarea
          id="notas"
          className="form-control"
          rows="2"
          placeholder="Observaciones..."
          value={notas}
          onChange={(e) => onChangeNotas(e.target.value)}
        />
      </div>

      {/* Error de venta (ej: "Stock insuficiente" devuelto por trigger Supabase) */}
      {errorVenta && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 my-2 small">
          <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
          <span>{errorVenta}</span>
        </div>
      )}

      {/* ----------------------- ACCIONES ------------------------------ */}
      <div className="fp-checkout-actions">
        {/* COBRAR (boton principal) */}
        <button
          type="button"
          className="btn fp-btn-cobrar w-100"
          disabled={!hayItems || faltaMonto}
          onClick={onCobrar}
        >
          <i className="bi bi-check-circle me-2" />
          Cobrar {formatCLP(totals.total)}
        </button>
        <div className="d-flex gap-2 mt-2">
          {/* APARTAR = dejar la venta en espera */}
          <button
            type="button"
            className="btn btn-outline-secondary flex-fill"
            disabled={!hayItems}
            onClick={onApartar}
          >
            <i className="bi bi-pause-circle me-1" />
            Apartar
          </button>
          {/* COTIZAR = generar cotizacion sin afectar stock */}
          <button
            type="button"
            className="btn btn-outline-secondary flex-fill"
            disabled={!hayItems}
            onClick={onCotizar}
          >
            <i className="bi bi-file-earmark-text me-1" />
            Cotizar
          </button>
        </div>
      </div>
    </aside>
  );
}
