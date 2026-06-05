/**
 * PosTopBar.jsx
 * ---------------------------------------------------------------------------
 * BARRA SUPERIOR del Punto de Venta.
 * Incluye indicador de estado de conexion y contador de ventas pendientes.
 * ---------------------------------------------------------------------------
 */
import { forwardRef } from 'react';
import { formatLongDate } from '../utils/format';

const PosTopBar = forwardRef(function PosTopBar(
  {
    query, onQueryChange, onOpenAddProduct, onOpenHeld,
    onOpenBajoStock, bajoStockCount = 0,
    isOnline = true, pendingCount = 0, syncing = false, onSincronizar,
  },
  inputRef,
) {
  return (
    <header className="fp-pos-topbar d-flex align-items-center gap-3">
      {/* Indicador offline */}
      {!isOnline && (
        <div className="d-flex align-items-center gap-1 text-nowrap px-2 py-1 rounded"
          style={{ background: '#fff3cd', color: '#856404', fontSize: '0.78rem' }}>
          <i className="bi bi-wifi-off" />
          <span className="d-none d-md-inline">Sin conexion</span>
        </div>
      )}

      {/* Badge de ventas pendientes de sync */}
      {pendingCount > 0 && (
        <button
          type="button"
          className="btn btn-sm btn-warning text-nowrap d-flex align-items-center gap-1"
          onClick={onSincronizar}
          disabled={syncing || !isOnline}
          title="Ventas guardadas offline pendientes de sincronizar"
        >
          {syncing
            ? <span className="spinner-border spinner-border-sm" />
            : <i className="bi bi-arrow-repeat" />}
          <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Buscador */}
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

      {/* Añadir Producto */}
      <button
        type="button"
        className="btn btn-warning btn-lg d-flex align-items-center gap-2 text-nowrap fw-semibold"
        onClick={onOpenAddProduct}
        title="Buscar y agregar un producto al carrito (Atajo: F3)"
      >
        <i className="bi bi-plus-circle-fill" />
        Añadir Producto <small className="opacity-75">(F3)</small>
      </button>

      {/* Ventas Apartadas */}
      <button
        type="button"
        className="btn btn-outline-secondary btn-lg"
        title="Ventas apartadas"
        onClick={onOpenHeld}
      >
        <i className="bi bi-clock-history" />
      </button>

      {/* Campana bajo stock */}
      <button
        type="button"
        className={`btn btn-lg position-relative ${bajoStockCount > 0 ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
        title="Alertas de stock bajo"
        onClick={onOpenBajoStock}
      >
        <i className={`bi ${bajoStockCount > 0 ? 'bi-bell-fill' : 'bi-bell'}`} />
        {bajoStockCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {bajoStockCount > 99 ? '99+' : bajoStockCount}
            <span className="visually-hidden">productos con bajo stock</span>
          </span>
        )}
      </button>

      {/* Fecha */}
      <div className="text-end lh-sm flex-shrink-0 d-none d-lg-block">
        <div className="text-secondary text-nowrap" style={{ fontSize: '0.78rem' }}>
          {formatLongDate()}
        </div>
      </div>
    </header>
  );
});

export default PosTopBar;
