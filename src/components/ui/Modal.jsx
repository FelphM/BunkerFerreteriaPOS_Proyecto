/**
 * Modal.jsx
 * ---------------------------------------------------------------------------
 * Modal reutilizable: usa el markup y los estilos de Bootstrap 5, pero la
 * visibilidad la controla React (prop `show`). Evita el JS de Bootstrap para
 * no tener desincronismos de estado.
 *
 * Cierre: boton X / tecla ESC / clic en el backdrop.
 *
 * @param {boolean}  show      Si el modal esta visible.
 * @param {Function} onClose   Callback para cerrar.
 * @param {string}   titulo    Titulo del modal.
 * @param {string}   [icono]   Clase de Bootstrap Icon para el titulo.
 * @param {'sm'|'lg'|'xl'} [size] Tamano del dialog (Bootstrap modal-*).
 * @param {React.ReactNode} children Cuerpo del modal.
 * @param {React.ReactNode} [footer] Contenido del pie (botones).
 * ---------------------------------------------------------------------------
 */
import { useEffect } from 'react';

export default function Modal({
  show,
  onClose,
  titulo,
  icono,
  size,
  children,
  footer,
}) {
  // Cierre con ESC + bloqueo del scroll del body mientras esta abierto.
  useEffect(() => {
    if (!show) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [show, onClose]);

  if (!show) return null;

  const sizeClass = size ? `modal-${size}` : '';

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClass}`}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {icono && <i className={`bi ${icono} me-2 text-warning`} />}
                {titulo}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
