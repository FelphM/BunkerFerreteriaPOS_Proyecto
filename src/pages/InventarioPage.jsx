/**
 * InventarioPage.jsx
 * ---------------------------------------------------------------------------
 * Inventario: listado de variantes (SKU) con stock, precios y estado.
 * Permite buscar, filtrar por categoria, ver solo alertas de stock y
 * consultar la bitacora de movimientos de cada variante.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import {
  getVariantesInventario,
  getCategorias,
  getMovimientosPorVariante,
} from '../data/queries';
import { formatCLP, formatFechaHora } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';

// Etiquetas de color para los tipos de movimiento de inventario.
const COLOR_MOVIMIENTO = {
  VENTA: 'danger',
  INGRESO_PROVEEDOR: 'success',
  AJUSTE_MERMA: 'warning',
  CARGA_INICIAL: 'secondary',
};

/** Devuelve el estado de stock de una variante. */
function estadoStock(v) {
  if (!v.activo) return { texto: 'Inactivo', color: 'secondary' };
  if (v.stock_actual <= 0) return { texto: 'Agotado', color: 'danger' };
  if (v.stock_actual <= v.stock_minimo)
    return { texto: 'Stock bajo', color: 'warning' };
  return { texto: 'Disponible', color: 'success' };
}

export default function InventarioPage() {
  const variantes = useMemo(() => getVariantesInventario(), []);
  const categorias = useMemo(() => getCategorias(), []);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [varianteSel, setVarianteSel] = useState(null);

  // Filtrado combinado.
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return variantes.filter((v) => {
      const coincideTexto =
        !q ||
        v.producto_nombre.toLowerCase().includes(q) ||
        v.codigo_interno.toLowerCase().includes(q) ||
        v.codigo_barras.includes(q);
      const coincideCategoria =
        !categoriaId || v.categoria_id === categoriaId;
      const coincideAlerta =
        !soloAlertas || (v.activo && v.stock_actual <= v.stock_minimo);
      return coincideTexto && coincideCategoria && coincideAlerta;
    });
  }, [variantes, busqueda, categoriaId, soloAlertas]);

  // KPIs.
  const kpis = useMemo(() => {
    const activas = variantes.filter((v) => v.activo);
    return {
      total: variantes.length,
      valor: variantes.reduce((s, v) => s + v.valor_stock, 0),
      bajo: activas.filter((v) => v.stock_actual <= v.stock_minimo).length,
      agotados: activas.filter((v) => v.stock_actual <= 0).length,
    };
  }, [variantes]);

  // Movimientos de la variante abierta en el modal.
  const movimientos = useMemo(
    () => (varianteSel ? getMovimientosPorVariante(varianteSel.id) : []),
    [varianteSel],
  );

  return (
    <>
      <PageHeader
        titulo="Inventario"
        icono="bi-box-seam"
        descripcion={`${variantes.length} variantes registradas`}
      />

      <div className="fp-page-body">
        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Variantes"
              valor={kpis.total}
              icono="bi-upc"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Valor inventario"
              valor={formatCLP(kpis.valor)}
              subtitulo="a precio de costo"
              icono="bi-cash-coin"
              color="success"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Stock bajo"
              valor={kpis.bajo}
              icono="bi-exclamation-triangle"
              color="warning"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Agotados"
              valor={kpis.agotados}
              icono="bi-x-octagon"
              color="danger"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm fp-filtro-busqueda">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre o codigo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="form-select form-select-sm w-auto"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="form-check form-switch ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="soloAlertas"
                checked={soloAlertas}
                onChange={(e) => setSoloAlertas(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="soloAlertas">
                Solo stock bajo
              </label>
            </div>
            <span className="ms-auto small text-secondary">
              {filtradas.length} resultado(s)
            </span>
          </div>

          {/* Tabla */}
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Categoria</th>
                  <th className="text-end">P. Compra</th>
                  <th className="text-end">Margen</th>
                  <th className="text-end">P. Venta</th>
                  <th className="text-end">Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center text-secondary py-4">
                      Sin resultados para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((v) => {
                    const estado = estadoStock(v);
                    return (
                      <tr key={v.id}>
                        <td className="text-nowrap">
                          <div>{v.codigo_interno}</div>
                          <small className="text-secondary">
                            {v.codigo_barras}
                          </small>
                        </td>
                        <td>
                          <div className="fw-semibold text-nowrap">
                            {v.producto_nombre}
                          </div>
                          <small className="text-secondary">
                            {v.variante_nombre} &middot; {v.unidad_venta}
                          </small>
                        </td>
                        <td className="text-nowrap">{v.categoria_nombre}</td>
                        <td className="text-end text-nowrap">
                          {formatCLP(v.precio_compra)}
                        </td>
                        <td className="text-end">{v.margen_ganancia}%</td>
                        <td className="text-end text-nowrap fw-semibold">
                          {formatCLP(v.precio_venta)}
                        </td>
                        <td className="text-end">
                          {v.stock_actual} {v.unidad_venta}
                        </td>
                        <td>
                          <span className={`badge bg-${estado.color}`}>
                            {estado.texto}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary text-nowrap"
                            onClick={() => setVarianteSel(v)}
                          >
                            <i className="bi bi-clock-history me-1" />
                            Movimientos
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: movimientos de la variante */}
      <Modal
        show={varianteSel !== null}
        onClose={() => setVarianteSel(null)}
        titulo={
          varianteSel
            ? `Movimientos: ${varianteSel.producto_nombre} ${varianteSel.variante_nombre}`
            : ''
        }
        icono="bi-clock-history"
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setVarianteSel(null)}
          >
            Cerrar
          </button>
        }
      >
        {movimientos.length === 0 ? (
          <p className="text-secondary text-center m-0 py-3">
            Esta variante no registra movimientos.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th className="text-end">Cantidad</th>
                  <th className="text-end">Stock</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="text-nowrap text-secondary">
                      {formatFechaHora(m.creado_en)}
                    </td>
                    <td>
                      <span
                        className={`badge bg-${
                          COLOR_MOVIMIENTO[m.tipo_movimiento] || 'secondary'
                        }`}
                      >
                        {m.tipo_movimiento.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-end">{m.cantidad}</td>
                    <td className="text-end text-nowrap">
                      {m.stock_anterior} &rarr; {m.stock_nuevo}
                    </td>
                    <td>
                      <small>{m.observaciones}</small>
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
