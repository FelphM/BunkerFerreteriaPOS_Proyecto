/**
 * CheckoutPanel.jsx
 * ---------------------------------------------------------------------------
 * PANEL DERECHO: Cobro de la venta.
 *
 *   - Resumen destacado: Subtotal (neto), IVA y TOTAL.
 *   - Metodo de pago: Efectivo / Tarjeta / Transferencia.
 *   - Monto recibido + montos rapidos + calculo de vuelto (solo efectivo).
 *   - Cliente: campo con buscador autocomplete sobre la tabla `clientes`,
 *     incluye opcion para registrar un nuevo cliente.
 *   - Notas de la venta.
 *   - Acciones: COBRAR (finaliza), APARTAR (deja en espera), COTIZAR.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCLP, safeQty } from '../utils/format';

const METODOS_PAGO = [
  { value: 'Efectivo',      label: 'Efectivo',  icono: 'bi-cash-coin'  },
  { value: 'Transbank',     label: 'Tarjeta',   icono: 'bi-credit-card' },
  { value: 'Transferencia', label: 'Transfer.', icono: 'bi-bank'       },
];

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
  // Clientes para el buscador
  clientes = [],
  onAbrirNuevoCliente,
}) {
  const esEfectivo = metodoPago === 'Efectivo';
  const recibido = safeQty(montoRecibido);
  const vuelto = recibido - totals.total;
  const faltaMonto = esEfectivo && recibido < totals.total;

  // --- Buscador de clientes ---
  const [showDropdown, setShowDropdown] = useState(false);
  const clienteWrapRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (clienteWrapRef.current && !clienteWrapRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // Filtrar clientes segun lo que hay escrito en el campo
  const clientesFiltrados = useMemo(() => {
    const q = cliente.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter((c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.rut?.toLowerCase().includes(q) ||
        c.correo?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clientes, cliente]);

  const handleSelectCliente = (c) => {
    onChangeCliente(c.nombre ?? '');
    setShowDropdown(false);
  };

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
          <span className="fp-total-amount text-nowrap">{formatCLP(totals.total)}</span>
        </div>
      </div>

      {/* Cuerpo desplazable */}
      <div className="fp-checkout-body flex-grow-1 overflow-auto">
        {/* --------------------- METODO DE PAGO ------------------------ */}
        <label className="fp-field-label">Metodo de pago</label>
        <div className="fp-pay-methods">
          {METODOS_PAGO.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`fp-pay-method ${metodoPago === m.value ? 'active' : ''}`}
              onClick={() => onChangeMetodoPago(m.value)}
            >
              <i className={`bi ${m.icono} fs-5`} />
              <span className="small">{m.label}</span>
            </button>
          ))}
        </div>

        {/* ------------------- MONTO RECIBIDO -------------------------- */}
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

            {hayItems && recibido > 0 && (
              <div className={`fp-vuelto ${vuelto >= 0 ? 'ok' : 'falta'}`}>
                <span>{vuelto >= 0 ? 'Vuelto' : 'Falta'}</span>
                <strong>{formatCLP(Math.abs(vuelto))}</strong>
              </div>
            )}
          </>
        )}

        {/* ---------------------- CLIENTE ------------------------------ */}
        <label className="fp-field-label" htmlFor="cliente">Cliente</label>
        <div className="fp-cliente-wrap" ref={clienteWrapRef}>
          <div className="input-group">
            <input
              id="cliente"
              type="text"
              className="form-control"
              placeholder="Publico en general"
              value={cliente}
              autoComplete="off"
              onChange={(e) => {
                onChangeCliente(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              title={showDropdown ? 'Cerrar buscador' : 'Buscar cliente'}
              onClick={() => setShowDropdown((v) => !v)}
            >
              <i className={`bi ${showDropdown ? 'bi-chevron-up' : 'bi-search'}`} />
            </button>
          </div>

          {showDropdown && (
            <div className="fp-cliente-dropdown">
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="fp-cliente-option"
                    onMouseDown={(e) => e.preventDefault()} // evita blur antes del click
                    onClick={() => handleSelectCliente(c)}
                  >
                    <span className="fw-semibold">{c.nombre}</span>
                    {c.rut && (
                      <small className="text-secondary">{c.rut}</small>
                    )}
                  </button>
                ))
              ) : (
                <div className="fp-cliente-empty">Sin coincidencias</div>
              )}

              {/* Opcion para registrar cliente nuevo */}
              <button
                type="button"
                className="fp-cliente-option fp-cliente-option-nuevo"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowDropdown(false);
                  onAbrirNuevoCliente?.();
                }}
              >
                <i className="bi bi-person-plus me-2" />
                Registrar nuevo cliente
              </button>
            </div>
          )}
        </div>

        {/* ----------------------- NOTAS ------------------------------- */}
        <label className="fp-field-label" htmlFor="notas">Notas</label>
        <textarea
          id="notas"
          className="form-control"
          rows="2"
          placeholder="Observaciones..."
          value={notas}
          onChange={(e) => onChangeNotas(e.target.value)}
        />
      </div>

      {/* Error de venta */}
      {errorVenta && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 my-2 small">
          <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
          <span>{errorVenta}</span>
        </div>
      )}

      {/* ----------------------- ACCIONES ------------------------------ */}
      <div className="fp-checkout-actions">
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
          <button
            type="button"
            className="btn btn-outline-secondary flex-fill"
            disabled={!hayItems}
            onClick={onApartar}
          >
            <i className="bi bi-pause-circle me-1" />
            Apartar
          </button>
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
