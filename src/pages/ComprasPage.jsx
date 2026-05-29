/**
 * ComprasPage.jsx
 * ---------------------------------------------------------------------------
 * Ordenes de compra a proveedores: listado con filtro por estado y proveedor,
 * indicadores y modal con el detalle de cada compra.
 *
 * Estados (segun esquema): BORRADOR, CONFIRMADA, ANULADA.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getCompras, getDetalleCompra } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { formatCLP, formatFechaHora } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';

// Color del badge segun estado de la compra.
const COLOR_ESTADO = {
  BORRADOR: 'secondary',
  CONFIRMADA: 'success',
  ANULADA: 'danger',
};

export default function ComprasPage() {
  const { data: compras = [] } = useQuery(getCompras);

  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [compraSel, setCompraSel] = useState(null);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return compras.filter((c) => {
      const coincideTexto =
        !q ||
        c.proveedor_nombre.toLowerCase().includes(q) ||
        String(c.numero_compra).includes(q);
      const coincideEstado = !estado || c.estado === estado;
      return coincideTexto && coincideEstado;
    });
  }, [compras, busqueda, estado]);

  const kpis = useMemo(() => {
    const confirmadas = compras.filter((c) => c.estado === 'CONFIRMADA');
    return {
      total: compras.length,
      confirmadas: confirmadas.length,
      borradores: compras.filter((c) => c.estado === 'BORRADOR').length,
      montoConfirmado: confirmadas.reduce((s, c) => s + c.total, 0),
    };
  }, [compras]);

  const { data: detalle = [] } = useQuery(
    () => compraSel ? getDetalleCompra(compraSel.id) : Promise.resolve([]),
    [compraSel?.id],
  );

  return (
    <>
      <PageHeader
        titulo="Compras"
        icono="bi-bag"
        descripcion={`${compras.length} ordenes de compra`}
      />

      <div className="fp-page-body">
        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ordenes totales"
              valor={kpis.total}
              icono="bi-bag-check"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Confirmadas"
              valor={kpis.confirmadas}
              icono="bi-check-circle"
              color="success"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Borradores"
              valor={kpis.borradores}
              icono="bi-pencil-square"
              color="secondary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Monto confirmado"
              valor={formatCLP(kpis.montoConfirmado)}
              icono="bi-cash-coin"
              color="info"
            />
          </div>
        </div>

        {/* Filtros + tabla */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm fp-filtro-busqueda">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por proveedor o N. de compra..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="form-select form-select-sm w-auto"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="ANULADA">Anulada</option>
            </select>
            <span className="ms-auto small text-secondary">
              {filtradas.length} resultado(s)
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>N. Compra</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="text-end">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary py-4">
                      Sin compras para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">#{c.numero_compra}</td>
                      <td className="text-nowrap">{c.proveedor_nombre}</td>
                      <td className="text-nowrap text-secondary">
                        {formatFechaHora(c.creado_en)}
                      </td>
                      <td>
                        <span
                          className={`badge bg-${
                            COLOR_ESTADO[c.estado] || 'secondary'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {formatCLP(c.total)}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary text-nowrap"
                          onClick={() => setCompraSel(c)}
                        >
                          <i className="bi bi-eye me-1" />
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: detalle de compra */}
      <Modal
        show={compraSel !== null}
        onClose={() => setCompraSel(null)}
        titulo={compraSel ? `Compra #${compraSel.numero_compra}` : ''}
        icono="bi-bag"
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setCompraSel(null)}
          >
            Cerrar
          </button>
        }
      >
        {compraSel && (
          <>
            <div className="row g-2 mb-3 small">
              <div className="col-sm-6">
                <span className="text-secondary">Proveedor: </span>
                <strong>{compraSel.proveedor_nombre}</strong>
              </div>
              <div className="col-sm-6">
                <span className="text-secondary">Estado: </span>
                <span
                  className={`badge bg-${
                    COLOR_ESTADO[compraSel.estado] || 'secondary'
                  }`}
                >
                  {compraSel.estado}
                </span>
              </div>
              <div className="col-sm-6">
                <span className="text-secondary">Fecha: </span>
                {formatFechaHora(compraSel.creado_en)}
              </div>
              {compraSel.observaciones && (
                <div className="col-12">
                  <span className="text-secondary">Observaciones: </span>
                  {compraSel.observaciones}
                </div>
              )}
            </div>

            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Cantidad</th>
                  <th className="text-end">P. Unitario</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.producto_nombre}
                      <small className="text-secondary">
                        {' '}
                        {d.variante_nombre}
                      </small>
                    </td>
                    <td className="text-end">
                      {d.cantidad} {d.unidad_venta}
                    </td>
                    <td className="text-end">
                      {formatCLP(d.precio_unitario)}
                    </td>
                    <td className="text-end fw-semibold">
                      {formatCLP(d.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="text-end fw-bold">
                    TOTAL
                  </td>
                  <td className="text-end fw-bold fs-6">
                    {formatCLP(compraSel.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </Modal>
    </>
  );
}
