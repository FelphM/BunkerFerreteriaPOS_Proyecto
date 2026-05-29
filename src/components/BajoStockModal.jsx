/**
 * BajoStockModal.jsx
 * ---------------------------------------------------------------------------
 * Modal de notificacion de bajo stock: lista las variantes cuyo stock_actual
 * es menor o igual a su stock_minimo.
 *
 * Props:
 *   show        {boolean}   Visibilidad.
 *   onClose     {Function}  Callback de cierre.
 *   productos   {Array}     Variantes con bajo stock (ya filtradas).
 * ---------------------------------------------------------------------------
 */
import Modal from './ui/Modal';

export default function BajoStockModal({ show, onClose, productos = [] }) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      titulo="Alerta de stock bajo"
      icono="bi-bell-fill"
      size="lg"
    >
      {productos.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-check-circle fs-1 d-block mb-2 text-success opacity-75" />
          <p className="mb-0 fw-semibold">Todo el inventario esta en orden.</p>
          <small>No hay productos por debajo del stock minimo.</small>
        </div>
      ) : (
        <>
          <div className="alert alert-warning py-2 mb-3 small">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            <strong>{productos.length} producto(s)</strong> con stock igual o por debajo del minimo.
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th className="text-center">Stock actual</th>
                  <th className="text-center">Stock minimo</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const critico = p.stock_actual === 0;
                  return (
                    <tr key={p.id} className={critico ? 'table-danger' : 'table-warning'}>
                      <td className="fw-semibold">{p.producto_nombre}</td>
                      <td className="text-secondary">{p.variante_nombre || '—'}</td>
                      <td className="text-center">
                        <span className={`badge ${critico ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td className="text-center text-muted">{p.stock_minimo}</td>
                      <td className="text-secondary text-nowrap">{p.proveedor_nombre}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
