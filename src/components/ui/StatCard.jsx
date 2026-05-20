/**
 * StatCard.jsx
 * ---------------------------------------------------------------------------
 * Tarjeta de indicador (KPI) reutilizable en Dashboard, Reportes y los
 * encabezados de las vistas de consulta.
 *
 * @param {string} titulo     Etiqueta del indicador.
 * @param {string|number} valor  Valor principal a destacar.
 * @param {string} icono      Clase de Bootstrap Icon.
 * @param {string} [color]    Variante de color Bootstrap (primary, success,
 *                            warning, danger, info...). Default: 'secondary'.
 * @param {string} [subtitulo] Texto pequeno bajo el valor.
 * ---------------------------------------------------------------------------
 */
export default function StatCard({
  titulo,
  valor,
  icono,
  color = 'secondary',
  subtitulo,
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <div className={`fp-stat-icon text-${color} bg-${color}-subtle`}>
          <i className={`bi ${icono}`} />
        </div>
        <div className="min-w-0">
          <div className="text-secondary text-uppercase fp-stat-label">
            {titulo}
          </div>
          <div className="fp-stat-value text-truncate">{valor}</div>
          {subtitulo && (
            <small className="text-secondary">{subtitulo}</small>
          )}
        </div>
      </div>
    </div>
  );
}
