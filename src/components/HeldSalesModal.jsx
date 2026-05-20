/**
 * HeldSalesModal.jsx
 * ---------------------------------------------------------------------------
 * Modal para gestionar las VENTAS APARTADAS.
 *
 * Lista las `ventas_en_espera`; al elegir una, recarga su carrito en la
 * venta actual.
 *
 * Usa el MARKUP y los estilos de modal de Bootstrap 5, pero la visibilidad
 * la controla React (prop `show`) en lugar del JS de Bootstrap. Esto evita
 * el desincronismo entre el estado de React y el ciclo de eventos del modal,
 * y mantiene el componente 100% declarativo.
 *
 * Cierre: boton X / boton Cerrar / tecla ESC / clic en el backdrop.
 * ---------------------------------------------------------------------------
 */
import { useEffect } from 'react';
import { formatCLP, safeQty } from '../utils/format';

export default function HeldSalesModal({ show, onClose, heldSales, onRecover }) {
  // Cierre con tecla ESC + bloqueo de scroll del body mientras esta abierto.
  useEffect(() => {
    if (!show) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [show, onClose]);

  if (!show) return null;

  /** Total de una venta apartada (para mostrarlo en la lista). */
  const calcularTotal = (carrito = []) =>
    carrito.reduce(
      (acc, item) => acc + safeQty(item.cantidad) * item.precio_venta,
      0,
    );

  return (
    <>
      {/* Contenedor del modal. El clic en esta capa (fuera del dialog) cierra. */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="heldSalesModalLabel"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="heldSalesModalLabel">
                <i className="bi bi-clock-history me-2 text-warning" />
                Ventas Apartadas
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>

            <div className="modal-body">
              {heldSales.length === 0 ? (
                <div className="text-center text-secondary py-4">
                  <i className="bi bi-inbox display-4 d-block mb-2" />
                  No hay ventas apartadas.
                </div>
              ) : (
                <ul className="list-group">
                  {heldSales.map((espera) => (
                    <li
                      key={espera.id}
                      className="list-group-item d-flex align-items-center justify-content-between py-3"
                    >
                      <div className="text-nowrap">
                        <div className="fw-bold">
                          <i className="bi bi-person-badge me-2 text-secondary" />
                          {espera.nombre_referencia}
                        </div>
                        <small className="text-secondary">
                          {espera.carrito?.length || 0} producto(s) &middot;{' '}
                          {formatCLP(calcularTotal(espera.carrito))}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn fp-btn-accent text-nowrap"
                        onClick={() => onRecover(espera.id)}
                      >
                        <i className="bi bi-arrow-clockwise me-2" />
                        Recuperar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fondo oscuro */}
      <div className="modal-backdrop fade show" />
    </>
  );
}
