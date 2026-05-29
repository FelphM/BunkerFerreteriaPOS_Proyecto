/**
 * PosTopBar.jsx
 * ---------------------------------------------------------------------------
 * BARRA SUPERIOR del Punto de Venta.
 *
 *   - Buscador global: filtra la grilla central en tiempo real.
 *   - Botón "Añadir Producto": abre el modal de busqueda manual para agregar
 *     items al carrito sin necesidad de la grilla o la pistola.
 *   - Botón historial de ventas apartadas.
 *   - Fecha y nombre de caja.
 * ---------------------------------------------------------------------------
 */
import { forwardRef } from 'react';
import { formatLongDate } from '../utils/format';

const PosTopBar = forwardRef(function PosTopBar(
  { query, onQueryChange, onOpenAddProduct, onOpenHeld },
  inputRef,
) {
  return (
    <header className="fp-pos-topbar d-flex align-items-center gap-3">
      {/* ------------------------- BUSCADOR ---------------------------- */}
      <div className="input-group input-group-lg flex-grow-1 shadow-sm">
        <span className="input-group-text bg-white text-secondary border-end-0">
          <i className="bi bi-search" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="form-control border-start-0 ps-0"
          placeholder="Filtrar grilla por nombre, código o categoría..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            type="button"
            className="input-group-text bg-white border-start-0"
            onClick={() => onQueryChange('')}
            aria-label="Limpiar filtro"
          >
            <i className="bi bi-x-lg text-secondary" />
          </button>
        )}
      </div>

      {/* ------------------ BOTON AÑADIR PRODUCTO ---------------------- */}
      <button
        type="button"
        className="btn btn-warning btn-lg d-flex align-items-center gap-2 text-nowrap fw-semibold"
        onClick={onOpenAddProduct}
        title="Buscar y agregar un producto al carrito"
      >
        <i className="bi bi-plus-circle-fill" />
        Añadir Producto
      </button>

      {/* ----------------- BOTON VENTAS APARTADAS ---------------------- */}
      <button
        type="button"
        className="btn btn-outline-secondary btn-lg"
        title="Ventas apartadas"
        onClick={onOpenHeld}
      >
        <i className="bi bi-clock-history" />
      </button>

      {/* ----------------------- FECHA / CAJA -------------------------- */}
      <div className="text-end lh-sm flex-shrink-0">
        <div className="text-secondary text-nowrap">{formatLongDate()}</div>
        <strong className="text-nowrap">Caja #1</strong>
      </div>
    </header>
  );
});

export default PosTopBar;
