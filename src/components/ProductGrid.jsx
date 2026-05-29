/**
 * ProductGrid.jsx
 * ---------------------------------------------------------------------------
 * PANEL CENTRAL del POS: catalogo de productos.
 *   - Pestanas de categoria.
 *   - Grilla de <ProductCard /> filtrada por categoria + buscador.
 *
 * Las categorias y los items llegan ya cargados desde Supabase (via PosPage).
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ items, categorias = [], query, onAddItem, onEditItem, cargando }) {
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  const ICONO_POR_CATEGORIA = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.icono])),
    [categorias],
  );

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

  if (cargando) {
    return (
      <section className="fp-product-grid card border-0 shadow-sm h-100 d-flex align-items-center justify-content-center text-secondary">
        <span className="spinner-border me-2" />
        Cargando catalogo...
      </section>
    );
  }

  return (
    <section className="fp-product-grid card border-0 shadow-sm h-100 d-flex flex-column">
      {/* Pestanas de categoria */}
      <div className="card-header bg-white border-bottom-0 pb-0">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn btn-sm fp-cat-tab ${categoriaActiva === null ? 'active' : ''}`}
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

      {/* Grilla */}
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
                iconoCategoria={ICONO_POR_CATEGORIA[item.id_categoria] ?? 'bi-box-seam'}
                onAdd={onAddItem}
                onEdit={onEditItem}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
