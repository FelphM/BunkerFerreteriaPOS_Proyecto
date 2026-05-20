/**
 * ProductGrid.jsx
 * ---------------------------------------------------------------------------
 * PANEL CENTRAL del POS: catalogo de productos.
 *
 *   - Pestanas de categoria ("Todos" + cada categoria).
 *   - Grilla de <ProductCard /> filtrada por categoria + texto del buscador.
 *
 * El filtro de texto se recibe por prop desde PosPage (buscador de la barra
 * superior). El filtro de categoria es estado local de este componente.
 *
 * @param {object[]} items     Items vendibles (getSellableItems()).
 * @param {string}   query     Texto del buscador global.
 * @param {Function} onAddItem Callback (item) => void al elegir un producto.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getCategorias } from '../data/queries';
import ProductCard from './ProductCard';

// Categorias y mapa id -> icono, calculados una sola vez al cargar el modulo.
const categorias = getCategorias();
const ICONO_POR_CATEGORIA = Object.fromEntries(
  categorias.map((c) => [c.id, c.icono]),
);

export default function ProductGrid({ items, query, onAddItem }) {
  // Categoria activa: null = "Todos".
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  // Filtrado combinado: categoria + texto de busqueda.
  const itemsFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const coincideCategoria =
        !categoriaActiva || item.id_categoria === categoriaActiva;
      const coincideTexto =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.codigo_barras.includes(q);
      return coincideCategoria && coincideTexto;
    });
  }, [items, query, categoriaActiva]);

  return (
    <section className="fp-product-grid card border-0 shadow-sm h-100 d-flex flex-column">
      {/* ----------------------- PESTANAS ------------------------------ */}
      <div className="card-header bg-white border-bottom-0 pb-0">
        <div className="d-flex flex-wrap gap-2">
          {/* Pestana "Todos" */}
          <button
            type="button"
            className={`btn btn-sm fp-cat-tab ${
              categoriaActiva === null ? 'active' : ''
            }`}
            onClick={() => setCategoriaActiva(null)}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`btn btn-sm fp-cat-tab d-flex align-items-center gap-1 ${
                categoriaActiva === cat.id ? 'active' : ''
              }`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              <i className={`bi ${cat.icono}`} />
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------- GRILLA ------------------------------ */}
      <div className="card-body overflow-auto">
        {itemsFiltrados.length === 0 ? (
          <div className="text-center text-secondary py-5">
            <i className="bi bi-search display-5 d-block mb-2" />
            Sin productos para los filtros actuales.
          </div>
        ) : (
          <div className="fp-grid">
            {itemsFiltrados.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                iconoCategoria={ICONO_POR_CATEGORIA[item.id_categoria]}
                onAdd={onAddItem}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
