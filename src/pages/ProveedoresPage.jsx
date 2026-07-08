/**
 * ProveedoresPage.jsx
 * ---------------------------------------------------------------------------
 * Proveedores: listado con datos de contacto y la cantidad de productos
 * asociados a cada uno. Incluye búsqueda y modal para agregar nuevos.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getProveedores, getProductosPorProveedor } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import AddProveedorModal from '../components/AddProveedorModal';
import EditProveedorModal from '../components/EditProveedorModal';

export default function ProveedoresPage() {
  const { data: proveedores = [], refetch } = useQuery(getProveedores);
  const [busqueda, setBusqueda] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editandoProveedor, setEditandoProveedor] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [productosProveedor, setProductosProveedor] = useState(null); // { id, nombre } del proveedor elegido

  const { data: productosDelProveedor = [], loading: cargandoProductos } = useQuery(
    () => (productosProveedor ? getProductosPorProveedor(productosProveedor.id) : Promise.resolve([])),
    [productosProveedor],
  );

  async function handleEliminarProveedor(p) {
    if (!window.confirm(`¿Eliminar al proveedor "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(p.id);
    try {
      const { error } = await supabase.from('proveedores').delete().eq('id', p.id);
      if (error) {
        if (error.code === '23503') {
          window.alert(
            `No se puede eliminar "${p.nombre}" porque tiene compras u otros registros asociados.\n\n` +
            `Para eliminarlo, primero eliminá las compras y facturas vinculadas a este proveedor, ` +
            `o reasignálas a otro proveedor.`,
          );
        } else {
          throw new Error(error.message);
        }
        return;
      }
      refetch();
    } catch (err) {
      window.alert(`Error al eliminar: ${err.message}`);
    } finally {
      setEliminando(null);
    }
  }

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
          className="btn fp-btn-accent"
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
                placeholder="Buscar por nombre, correo o dirección..."
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
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th className="text-center">Productos</th>
                  <th>Observaciones</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary py-4">
                      Sin proveedores para la búsqueda actual.
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
                        {p.productos_count > 0 ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 text-decoration-none"
                            title="Ver productos del proveedor"
                            onClick={() => setProductosProveedor({ id: p.id, nombre: p.nombre })}
                          >
                            <span className="badge bg-secondary">{p.productos_count}</span>
                          </button>
                        ) : (
                          <span className="badge bg-secondary">{p.productos_count}</span>
                        )}
                      </td>
                      <td>
                        <small className="text-secondary">
                          {p.observaciones || '-'}
                        </small>
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Editar proveedor"
                            onClick={() => setEditandoProveedor(p)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Eliminar proveedor"
                            disabled={eliminando === p.id}
                            onClick={() => handleEliminarProveedor(p)}
                          >
                            {eliminando === p.id
                              ? <span className="spinner-border spinner-border-sm" />
                              : <i className="bi bi-trash" />}
                          </button>
                        </div>
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

      <EditProveedorModal
        proveedor={editandoProveedor}
        onClose={() => setEditandoProveedor(null)}
        onProveedorEditado={() => { setEditandoProveedor(null); refetch(); }}
      />

      <Modal
        show={!!productosProveedor}
        onClose={() => setProductosProveedor(null)}
        titulo={productosProveedor ? `Productos de ${productosProveedor.nombre}` : ''}
        icono="bi-box-seam"
        size="lg"
      >
        {cargandoProductos ? (
          <div className="text-center py-4 text-secondary">
            <span className="spinner-border spinner-border-sm me-2" />Cargando...
          </div>
        ) : productosDelProveedor.length === 0 ? (
          <p className="text-secondary text-center m-0 py-3">Este proveedor no tiene productos asociados.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th>Código interno</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosDelProveedor.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.nombre}</td>
                    <td className="text-secondary">{p.codigo_interno || '-'}</td>
                    <td>
                      <span className={`badge bg-${p.activo ? 'success' : 'secondary'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}
