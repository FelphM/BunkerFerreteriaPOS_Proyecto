/**
 * PosTopBar.jsx
 * ---------------------------------------------------------------------------
 * BARRA SUPERIOR del Punto de Venta.
 *
 *   - Buscador global: filtra la grilla por nombre, codigo interno o codigo
 *     de barras (escritura manual).
 *   - Boton "Escanear": enfoca el buscador; la lectura real de la pistola USB
 *     la maneja el hook useBarcodeScanner a nivel de PosPage.
 *   - Accesos rapidos: nuevo cliente e historial de ventas apartadas.
 *   - Fecha larga y nombre de caja.
 *
 * Componente controlado: el valor del buscador vive en PosPage.
 * ---------------------------------------------------------------------------
 */
import { forwardRef } from 'react';
import { formatLongDate } from '../utils/format';
import { getConfigValor } from '../data/queries';

// forwardRef: PosPage necesita el ref del input para poder enfocarlo
// (boton "Escanear" y reseteo de foco tras agregar productos).
const PosTopBar = forwardRef(function PosTopBar(
  { query, onQueryChange, onScanClick, onAddClient, onOpenHeld },
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
          placeholder="Buscar producto por nombre, codigo o categoria..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoFocus
        />
      </div>

      {/* --------------------- ACCIONES RAPIDAS ------------------------ */}
      <button
        type="button"
        className="btn btn-outline-secondary btn-lg d-flex align-items-center gap-2 text-nowrap"
        onClick={onScanClick}
      >
        <i className="bi bi-upc-scan" />
        Escanear
      </button>

      <button
        type="button"
        className="btn btn-outline-secondary btn-lg"
        title="Nuevo cliente"
        onClick={onAddClient}
      >
        <i className="bi bi-person-plus" />
      </button>

      <button
        type="button"
        className="btn btn-outline-secondary btn-lg"
        title="Ventas apartadas"
        onClick={onOpenHeld}
      >
        <i className="bi bi-clock-history" />
      </button>

      {/* ----------------------- FECHA / CAJA -------------------------- */}
      <div className="text-end lh-sm">
        <div className="text-secondary text-nowrap">{formatLongDate()}</div>
        <strong className="text-nowrap">{getConfigValor('nombre_caja')}</strong>
      </div>
    </header>
  );
});

export default PosTopBar;
