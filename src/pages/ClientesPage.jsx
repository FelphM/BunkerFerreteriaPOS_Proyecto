/**
 * ClientesPage.jsx
 * ---------------------------------------------------------------------------
 * Muestra dos fuentes de clientes fusionadas:
 *   1. Tabla `clientes` de Supabase (registros explícitos).
 *   2. Historial derivado de `ventas` (clientes que compraron pero no están
 *      en la tabla clientes). Se identifican como "sin perfil".
 *
 * Cuando un cliente registrado tiene el mismo RUT que una venta, se enriquece
 * su fila con compras y total gastado.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getClientes, getClientesDerivados } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { supabase } from '../lib/supabaseClient';
import { formatCLP, formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import AddClienteModal from '../components/AddClienteModal';
import EditClienteModal from '../components/EditClienteModal';

export default function ClientesPage() {
  const { data: clientesRegistrados = [], refetch } = useQuery(getClientes);
  const { data: clientesVentas = [] } = useQuery(getClientesDerivados);
  const [busqueda, setBusqueda] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [eliminando, setEliminando] = useState(null);

  async function handleEliminarCliente(c) {
    if (!window.confirm(`¿Eliminar al cliente "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(c.clave);
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', c.clave);
      if (error) throw new Error(error.message);
      refetch();
    } catch (err) {
      window.alert(`Error al eliminar: ${err.message}`);
    } finally {
      setEliminando(null);
    }
  }

  // Fusiona ambas fuentes: clientes registrados enriquecidos con historial,
  // más clientes del historial de ventas que no tienen perfil creado.
  const clientesCombinados = useMemo(() => {
    const rutsRegistrados = new Set(
      clientesRegistrados.filter((c) => c.rut).map((c) => c.rut),
    );

    // Mapa de historial de ventas por RUT para cruzar datos
    const historialPorRut = new Map(
      clientesVentas
        .filter((c) => c.rut)
        .map((c) => [c.rut, c]),
    );

    // Clientes registrados (con historial si tienen RUT coincidente)
    const registrados = clientesRegistrados.map((c) => {
      const hist = c.rut ? historialPorRut.get(c.rut) : null;
      return {
        clave: c.id,
        nombre: c.nombre,
        rut: c.rut,
        correo: c.correo,
        telefono: c.telefono,
        giro: c.giro,
        compras: hist?.compras ?? 0,
        total_gastado: hist?.total_gastado ?? 0,
        ultima_compra: hist?.ultima_compra ?? null,
        tiene_perfil: true,
      };
    });

    // Clientes del historial sin perfil registrado
    const sinPerfil = clientesVentas
      .filter((c) => !rutsRegistrados.has(c.rut) && c.rut !== null)
      .map((c) => ({
        clave: c.clave,
        nombre: c.nombre,
        rut: c.rut,
        correo: c.correo,
        telefono: null,
        giro: null,
        compras: c.compras,
        total_gastado: c.total_gastado,
        ultima_compra: c.ultima_compra,
        tiene_perfil: false,
      }));

    // También clientes sin RUT derivados de ventas (si no están registrados por nombre)
    const nombresRegistrados = new Set(clientesRegistrados.map((c) => c.nombre.toLowerCase()));
    const sinRutSinPerfil = clientesVentas
      .filter((c) => !c.rut && !nombresRegistrados.has(c.nombre.toLowerCase()))
      .map((c) => ({
        clave: c.clave,
        nombre: c.nombre,
        rut: null,
        correo: c.correo,
        telefono: null,
        giro: null,
        compras: c.compras,
        total_gastado: c.total_gastado,
        ultima_compra: c.ultima_compra,
        tiene_perfil: false,
      }));

    return [...registrados, ...sinPerfil, ...sinRutSinPerfil].sort(
      (a, b) => b.total_gastado - a.total_gastado,
    );
  }, [clientesRegistrados, clientesVentas]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientesCombinados;
    return clientesCombinados.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.rut || '').toLowerCase().includes(q) ||
        (c.correo || '').toLowerCase().includes(q),
    );
  }, [clientesCombinados, busqueda]);

  const kpis = useMemo(() => {
    const totalVendido = clientesCombinados.reduce((s, c) => s + c.total_gastado, 0);
    const top = [...clientesCombinados].sort((a, b) => b.total_gastado - a.total_gastado)[0];
    return {
      total: clientesCombinados.length,
      registrados: clientesRegistrados.length,
      conRut: clientesCombinados.filter((c) => c.rut).length,
      top,
      totalVendido,
    };
  }, [clientesCombinados, clientesRegistrados]);

  return (
    <>
      <PageHeader
        titulo="Clientes"
        icono="bi-people"
        descripcion={`${kpis.registrados} registrados · ${kpis.total} en total`}
      >
        <button
          type="button"
          className="btn fp-btn-accent"
          onClick={() => setShowAdd(true)}
        >
          <i className="bi bi-person-plus me-1" />
          Nuevo cliente
        </button>
      </PageHeader>

      <div className="fp-page-body">
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Total clientes"
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
                  <th>Giro</th>
                  <th>Correo</th>
                  <th className="text-center">Compras</th>
                  <th className="text-end">Total gastado</th>
                  <th>Ultima compra</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-4">
                      Sin clientes para la busqueda actual.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((c) => (
                    <tr key={c.clave}>
                      <td>
                        <div className="fw-semibold text-nowrap">{c.nombre}</div>
                        {!c.tiene_perfil && (
                          <small className="text-muted">Solo historial de ventas</small>
                        )}
                      </td>
                      <td className="text-nowrap">{c.rut || '-'}</td>
                      <td className="text-nowrap text-secondary">{c.giro || '-'}</td>
                      <td className="text-nowrap">{c.correo || '-'}</td>
                      <td className="text-center">
                        <span className="badge bg-secondary">{c.compras}</span>
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {c.total_gastado > 0 ? formatCLP(c.total_gastado) : '-'}
                      </td>
                      <td className="text-nowrap text-secondary">
                        {c.ultima_compra ? formatFecha(c.ultima_compra) : '-'}
                      </td>
                      <td className="text-end">
                        {c.tiene_perfil && (
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              title="Editar cliente"
                              onClick={() => setEditandoCliente(c)}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar cliente"
                              disabled={eliminando === c.clave}
                              onClick={() => handleEliminarCliente(c)}
                            >
                              {eliminando === c.clave
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="bi bi-trash" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddClienteModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        onClienteCreado={() => { setShowAdd(false); refetch(); }}
      />

      <EditClienteModal
        cliente={editandoCliente}
        onClose={() => setEditandoCliente(null)}
        onClienteEditado={() => { setEditandoCliente(null); refetch(); }}
      />
    </>
  );
}
