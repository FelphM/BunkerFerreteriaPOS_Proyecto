/**
 * ClientesPage.jsx
 * ---------------------------------------------------------------------------
 * Clientes: el esquema NO tiene tabla `clientes`, por lo que esta vista se
 * construye DERIVANDO los clientes desde la tabla `ventas` (agrupados por
 * RUT, o por nombre cuando no hay RUT). Ver getClientesDerivados() en queries.
 *
 * Muestra, por cliente, su numero de compras, total gastado y ultima compra.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getClientesDerivados } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { formatCLP, formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

export default function ClientesPage() {
  const { data: clientes = [] } = useQuery(getClientesDerivados);
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.rut || '').toLowerCase().includes(q) ||
        (c.correo || '').toLowerCase().includes(q),
    );
  }, [clientes, busqueda]);

  const kpis = useMemo(() => {
    const totalVendido = clientes.reduce((s, c) => s + c.total_gastado, 0);
    return {
      total: clientes.length,
      conRut: clientes.filter((c) => c.rut).length,
      top: clientes[0], // getClientesDerivados ya ordena por total gastado
      totalVendido,
    };
  }, [clientes]);

  return (
    <>
      <PageHeader
        titulo="Clientes"
        icono="bi-people"
        descripcion="Derivado del historial de ventas"
      />

      <div className="fp-page-body">
        {/* Aviso: la vista es derivada, no hay tabla clientes */}


        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Clientes"
              valor={kpis.total}
              icono="bi-people"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Con RUT registrado"
              valor={kpis.conRut}
              icono="bi-person-vcard"
              color="info"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Mejor cliente"
              valor={kpis.top ? kpis.top.nombre : '-'}
              subtitulo={kpis.top ? formatCLP(kpis.top.total_gastado) : ''}
              icono="bi-star"
              color="warning"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Total facturado"
              valor={formatCLP(kpis.totalVendido)}
              icono="bi-cash-stack"
              color="success"
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
                placeholder="Buscar por nombre, RUT o correo..."
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
                  <th>Cliente</th>
                  <th>RUT</th>
                  <th>Correo</th>
                  <th className="text-center">Compras</th>
                  <th className="text-end">Total gastado</th>
                  <th>Ultima compra</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary py-4">
                      Sin clientes para la busqueda actual.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((c) => (
                    <tr key={c.clave}>
                      <td className="fw-semibold text-nowrap">{c.nombre}</td>
                      <td className="text-nowrap">{c.rut || '-'}</td>
                      <td className="text-nowrap">{c.correo || '-'}</td>
                      <td className="text-center">
                        <span className="badge bg-secondary">
                          {c.compras}
                        </span>
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {formatCLP(c.total_gastado)}
                      </td>
                      <td className="text-nowrap text-secondary">
                        {formatFecha(c.ultima_compra)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
