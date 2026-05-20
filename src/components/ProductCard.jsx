/**
 * ProductCard.jsx
 * ---------------------------------------------------------------------------
 * Tarjeta de un item vendible (SKU) dentro de la grilla del POS.
 *
 * Muestra: icono de categoria, nombre (+ variante si aplica), codigo interno,
 * precio unitario, unidad de venta y un badge de stock con semaforo de color.
 *
 * Al hacer clic agrega el item al carrito (salvo que este agotado).
 * Componente de presentacion puro.
 *
 * @param {object}   item        Item aplanado de getSellableItems().
 * @param {string}   iconoCategoria  Clase de Bootstrap Icon de su categoria.
 * @param {Function} onAdd       Callback (item) => void.
 * ---------------------------------------------------------------------------
 */
import { formatCLP, getStockStatus } from '../utils/format';

export default function ProductCard({ item, iconoCategoria, onAdd }) {
  const stock = getStockStatus(item.stock_actual);

  // Si el producto padre tiene varias medidas, mostramos la variante.
  const titulo = item.tieneVariantes
    ? `${item.nombre} ${item.variante_nombre}`
    : item.nombre;

  return (
    <button
      type="button"
      className="fp-product-card card border-0 shadow-sm h-100 text-start"
      onClick={() => onAdd(item)}
      disabled={stock.agotado}
      title={stock.agotado ? 'Producto agotado' : `Agregar ${titulo}`}
    >
      <div className="card-body d-flex flex-column p-2">
        {/* Icono de categoria */}
        <div className="fp-product-icon text-center mb-1">
          <i className={`bi ${iconoCategoria}`} />
        </div>

        {/* Nombre + codigo interno */}
        <div className="fp-product-name fw-semibold lh-sm">{titulo}</div>
        <small className="text-secondary">{item.codigo}</small>

        {/* Precio + unidad */}
        <div className="mt-auto">
          <div className="fp-product-price fw-bold">
            {formatCLP(item.precio_venta)}
          </div>
          <small className="text-secondary">/ {item.unidad_venta}</small>
        </div>

        {/* Badge de stock (semaforo) */}
        <span
          className={`badge bg-${stock.variante} fp-stock-badge mt-2 align-self-start`}
        >
          {stock.texto}
        </span>
      </div>
    </button>
  );
}
