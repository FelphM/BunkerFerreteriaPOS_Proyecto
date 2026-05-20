/**
 * PagePlaceholder.jsx
 * ---------------------------------------------------------------------------
 * Vista placeholder cohesiva. Hoy solo la usa la ruta comodin (404), pero
 * sigue disponible por si se agrega una seccion nueva al sidebar antes de
 * construir su pagina real.
 *
 * @param {string} titulo
 * @param {string} icono
 * @param {string} [descripcion]
 * ---------------------------------------------------------------------------
 */
import PageHeader from './ui/PageHeader';

export default function PagePlaceholder({ titulo, icono, descripcion }) {
  return (
    <>
      <PageHeader
        titulo={titulo}
        icono={icono}
        descripcion={descripcion || `Modulo de ${titulo.toLowerCase()}`}
      />
      <div className="fp-page-body">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex flex-column align-items-center justify-content-center text-center text-secondary">
            <div className="fp-placeholder-icon mb-3">
              <i className={`bi ${icono}`} />
            </div>
            <h2 className="h5">Seccion {titulo} en construccion</h2>
            <p className="mb-0" style={{ maxWidth: '420px' }}>
              Esta vista comparte el layout y estilo del sistema, lista para
              implementar.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
