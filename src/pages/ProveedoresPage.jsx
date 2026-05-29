/**
 * ProveedoresPage.jsx
 * ---------------------------------------------------------------------------
 * Proveedores: listado con datos de contacto y la cantidad de productos
 * asociados a cada uno. Incluye busqueda y modal para agregar nuevos.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getProveedores } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import AddProveedorModal from '../components/AddProveedorModal';

export default function ProveedoresPage() {
  const { data: proveedores = [], refetch } = useQuery(getProveedores);
  const [busqueda, setBusqueda] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.correo || '').toLowerCase().includes(q) ||
        (p.direccion || '').toLowerCase().includes(q),
    );
  }, [proveedores, busqueda]);

  const totalProductos = useMemo(
    () => proveedores.reduce((s, p) => s + p.productos_count, 0),
    [proveedores],
  );

  return (
    <>
      <PageHeader
        titulo="Proveedores"
        icono="bi-truck"
        descripcion={`${proveedores.length} proveedores registrados`}
      >
        <button
          type="button"
          className="btn btn-sm fp-btn-accent"
          onClick={() => setShowAdd(true)}
        >
          <i className="bi bi-plus-lg me-1" />
          Nuevo proveedor
        </button>
      </PageHeader>

      <div className="fp-page-body">
        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-4">
            <StatCard
              titulo="Proveedores"
              valor={proveedores.length}
              icono="bi-truck"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-4">
            <StatCard
              titulo="Productos asociados"
              valor={totalProductos}
              icono="bi-box-seam"
              color="info"
            />
          </div>
        </div>

        {/* Filtro + tabla */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm fp-filtro-busqueda">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, correo o direccion..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <span className="ms-auto small text-secondary">
              {filtrados.length} resultado(s)
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>Proveedor</th>
                  <th>Telefono</th>
                  <th>Correo</th>
                  <th className="text-center">Productos</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-secondary py-4">
                      Sin proveedores para la busqueda actual.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-semibold text-nowrap">
                          {p.nombre}
                        </div>
                        <small className="text-secondary">
                          {p.direccion}
                        </small>
                      </td>
                      <td className="text-nowrap">{p.telefono || '-'}</td>
                      <td className="text-nowrap">{p.correo || '-'}</td>
                      <td className="text-center">
                        <span className="badge bg-secondary">
                          {p.productos_count}
                        </span>
                      </td>
                      <td>
                        <small className="text-secondary">
                          {p.observaciones || '-'}
                        </small>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddProveedorModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        onProveedorCreado={() => { setShowAdd(false); refetch?.(); }}
      />
    </>
  );
}
