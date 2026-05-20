/**
 * PageHeader.jsx
 * ---------------------------------------------------------------------------
 * Encabezado estandar de las vistas del back-office (Dashboard, Inventario,
 * Ventas, etc.). Garantiza que todas las secciones compartan el mismo patron
 * visual: icono + titulo + descripcion, con una zona opcional de acciones.
 *
 * @param {string} titulo       Nombre de la seccion.
 * @param {string} icono        Clase de Bootstrap Icon (ej: "bi-box-seam").
 * @param {string} [descripcion] Texto guia bajo el titulo.
 * @param {React.ReactNode} [children] Acciones alineadas a la derecha
 *                                     (botones, filtros, etc.).
 * ---------------------------------------------------------------------------
 */
export default function PageHeader({ titulo, icono, descripcion, children }) {
  return (
    <header className="fp-page-header d-flex align-items-center gap-3">
      <div className="fp-page-icon d-flex align-items-center justify-content-center">
        <i className={`bi ${icono}`} />
      </div>
      <div className="me-auto">
        <h1 className="h4 m-0">{titulo}</h1>
        {descripcion && (
          <small className="text-secondary">{descripcion}</small>
        )}
      </div>
      {/* Zona de acciones (opcional) */}
      {children && (
        <div className="d-flex align-items-center gap-2">{children}</div>
      )}
    </header>
  );
}
