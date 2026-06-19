/**
 * ProductCard.jsx
 * ---------------------------------------------------------------------------
 * Tarjeta de un item vendible dentro de la grilla del POS.
 * Click en la tarjeta → agrega al carrito.
 * Click en el icono de edicion → abre EditProductModal.
 * ---------------------------------------------------------------------------
 */
import { formatCLP, getStockStatus } from '../utils/format';

export default function ProductCard({ item, iconoCategoria, onAdd, onEdit }) {
  const stock = getStockStatus(item.stock_actual);
  // Tooltip muestra nombre completo solo cuando hay variantes
  const tooltipTitulo = item.tieneVariantes
    ? `${item.nombre} — ${item.variante_nombre}`
    : item.nombre;

  return (
    <div
      className={`fp-product-card card border-0 shadow-sm h-100 position-relative ${stock.agotado ? 'opacity-60' : ''}`}
      style={{ cursor: stock.agotado ? 'not-allowed' : 'pointer' }}
      onClick={() => !stock.agotado && onAdd(item)}
      title={stock.agotado ? 'Producto agotado' : `Agregar ${tooltipTitulo}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !stock.agotado) onAdd(item); }}
    >
      {/* Boton editar — esquina superior derecha */}
      <button
        type="button"
        className="btn btn-sm btn-light position-absolute top-0 end-0 m-1 p-1 lh-1 opacity-0 fp-edit-btn"
        style={{ zIndex: 2, lineHeight: 1 }}
        title="Editar producto"
        onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
        tabIndex={-1}
      >
        <i className="bi bi-pencil" style={{ fontSize: '0.7rem' }} />
      </button>

      <div className="card-body d-flex flex-column p-2">
        <div className="fp-product-icon text-center mb-1">
          <i className={`bi ${iconoCategoria}`} />
        </div>
        {/* Nombre del producto siempre en el título */}
        <div className="fp-product-name fw-semibold lh-sm">{item.nombre}</div>
        {/* Variante como subtítulo separado cuando hay múltiples */}
        {item.tieneVariantes
          ? <small className="text-primary fw-semibold">{item.variante_nombre}</small>
          : <small className="text-secondary">{item.codigo}</small>}
        <div className="mt-auto">
          <div className="fp-product-price fw-bold">{formatCLP(item.precio_venta)}</div>
          <small className="text-secondary">/ {item.unidad_venta}</small>
        </div>
        <span className={`badge bg-${stock.variante} fp-stock-badge mt-2 align-self-start`}>
          {stock.texto}
        </span>
      </div>
    </div>
  );
}
