/**
 * CartPanel.jsx
 * ---------------------------------------------------------------------------
 * PANEL IZQUIERDO: Carrito de Venta.
 *
 * Lista cada item con: nombre + variante, codigo, control de cantidad
 * (- [input decimal] +), precio unitario, subtotal y boton de eliminar.
 *
 * Componente de presentacion: toda la logica vive en usePosCart.
 *
 * @param {object[]} cart             Items del carrito.
 * @param {Function} onChangeQuantity (id, delta)    -> botones + / -.
 * @param {Function} onSetQuantity    (id, valor)    -> input directo.
 * @param {Function} onRemoveItem     (id)           -> eliminar linea.
 * @param {Function} onClearCart      ()             -> vaciar carrito.
 * ---------------------------------------------------------------------------
 */
import { formatCLP, safeQty } from '../utils/format';

export default function CartPanel({
  cart,
  onChangeQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
}) {
  const vacio = cart.length === 0;

  return (
    <section className="fp-cart-panel card border-0 shadow-sm h-100 d-flex flex-column">
      {/* --------------------------- HEADER ---------------------------- */}
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <h2 className="h6 m-0 d-flex align-items-center gap-2">
          <i className="bi bi-cart3 text-warning" />
          Carrito de Venta
          <span className="badge fp-cart-count">{cart.length}</span>
        </h2>
        {!vacio && (
          <button
            type="button"
            className="btn btn-sm btn-link text-danger text-decoration-none p-0"
            onClick={onClearCart}
          >
            <i className="bi bi-trash3 me-1" />
            Vaciar
          </button>
        )}
      </div>

      {/* ---------------------------- BODY ----------------------------- */}
      <div className="card-body overflow-auto p-2">
        {vacio ? (
          // Estado vacio
          <div className="d-flex flex-column align-items-center justify-content-center text-secondary h-100 text-center px-3">
            <i className="bi bi-cart-x display-4 mb-3" />
            <h3 className="h6">El carrito esta vacio</h3>
            <p className="small mb-0">
              Haga clic en un producto para agregarlo.
            </p>
          </div>
        ) : (
          // Lista de items
          <ul className="list-unstyled m-0 d-flex flex-column gap-2">
            {cart.map((item) => {
              const subtotal = safeQty(item.cantidad) * item.precio_venta;
              return (
                <li key={item.id} className="fp-cart-item">
                  {/* Fila 1: nombre + eliminar */}
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="lh-sm">
                      <div className="fw-semibold">
                        {item.nombre}
                        {item.tieneVariantes && (
                          <span className="text-secondary">
                            {' '}
                            {item.variante_nombre}
                          </span>
                        )}
                      </div>
                      <small className="text-secondary">
                        {item.codigo} &middot; {formatCLP(item.precio_venta)} /{' '}
                        {item.unidad_venta}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Quitar ${item.nombre}`}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  {/* Fila 2: control de cantidad + subtotal */}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="input-group input-group-sm fp-qty-group">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onChangeQuantity(item.id, -1)}
                        aria-label="Disminuir cantidad"
                      >
                        <i className="bi bi-dash-lg" />
                      </button>
                      {/* Input numerico: acepta decimales (metro/kg). */}
                      <input
                        type="number"
                        className="form-control text-center"
                        min="0"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) =>
                          onSetQuantity(item.id, e.target.value)
                        }
                        aria-label={`Cantidad de ${item.nombre}`}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onChangeQuantity(item.id, 1)}
                        aria-label="Aumentar cantidad"
                      >
                        <i className="bi bi-plus-lg" />
                      </button>
                    </div>
                    <strong className="fp-cart-subtotal">
                      {formatCLP(subtotal)}
                    </strong>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
