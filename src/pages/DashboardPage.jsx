/**
 * DashboardPage.jsx
 * ---------------------------------------------------------------------------
 * Panel de control: indicadores del dia/mes, ultimas ventas, alertas de
 * stock y productos mas vendidos. Todo se calcula en vivo (useMemo) sobre
 * los datos de `queries.js`.
 * ---------------------------------------------------------------------------
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getVentas,
  getVariantesInventario,
  getVentasEnEspera,
  getDetalleVentasGlobal,
} from '../data/queries';
import { formatCLP, formatFechaHora, esHoy, esMesActual } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

export default function DashboardPage() {
  // Indicadores y listas derivadas (se calculan una vez por render).
  const datos = useMemo(() => {
    const ventas = getVentas();
    const variantes = getVariantesInventario();
    const enEspera = getVentasEnEspera();
    const detalle = getDetalleVentasGlobal();

    const ventasHoy = ventas.filter((v) => esHoy(v.creado_en));
    const ventasMes = ventas.filter((v) => esMesActual(v.creado_en));

    // Variantes activas con stock en o bajo el minimo.
    const stockBajo = variantes
      .filter((v) => v.activo && v.stock_actual <= v.stock_minimo)
      .sort((a, b) => a.stock_actual - b.stock_actual);

    // Ranking de productos por unidades vendidas.
    const porProducto = new Map();
    for (const linea of detalle) {
      const actual = porProducto.get(linea.producto_nombre) || {
        nombre: linea.producto_nombre,
        unidades: 0,
        monto: 0,
      };
      actual.unidades += linea.cantidad;
      actual.monto += linea.subtotal;
      porProducto.set(linea.producto_nombre, actual);
    }
    const topProductos = [...porProducto.values()]
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5);

    return {
      totalHoy: ventasHoy.reduce((s, v) => s + v.total, 0),
      countHoy: ventasHoy.length,
      totalMes: ventasMes.reduce((s, v) => s + v.total, 0),
      countMes: ventasMes.length,
      stockBajo,
      enEspera: enEspera.length,
      ultimasVentas: ventas.slice(0, 6),
      topProductos,
    };
  }, []);

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        icono="bi-speedometer2"
        descripcion="Resumen general de la operacion"
      />

      <div className="fp-page-body">
        {/* --------------------------- KPIs ----------------------------- */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ventas de hoy"
              valor={formatCLP(datos.totalHoy)}
              subtitulo={`${datos.countHoy} venta(s)`}
              icono="bi-cash-stack"
              color="success"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ventas del mes"
              valor={formatCLP(datos.totalMes)}
              subtitulo={`${datos.countMes} venta(s)`}
              icono="bi-graph-up-arrow"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Stock bajo"
              valor={datos.stockBajo.length}
              subtitulo="variantes en alerta"
              icono="bi-exclamation-triangle"
              color="warning"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ventas en espera"
              valor={datos.enEspera}
              subtitulo="carritos apartados"
              icono="bi-pause-circle"
              color="info"
            />
          </div>
        </div>

        {/* --------------------- Ventas + Stock ------------------------- */}
        <div className="row g-3">
          {/* Ultimas ventas */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Ultimas ventas</h2>
                <Link to="/ventas" className="small text-decoration-none">
                  Ver todas <i className="bi bi-arrow-right" />
                </Link>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle m-0">
                  <thead className="table-light">
                    <tr>
                      <th>N.</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.ultimasVentas.map((v) => (
                      <tr key={v.id}>
                        <td className="text-secondary">#{v.numero_venta}</td>
                        <td className="text-nowrap">{v.nombre_cliente}</td>
                        <td className="text-nowrap text-secondary">
                          {formatFechaHora(v.creado_en)}
                        </td>
                        <td className="text-end fw-semibold text-nowrap">
                          {formatCLP(v.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Alertas de stock */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h2 className="h6 m-0">Alertas de stock</h2>
                <Link to="/inventario" className="small text-decoration-none">
                  Inventario <i className="bi bi-arrow-right" />
                </Link>
              </div>
              <div className="card-body p-0">
                {datos.stockBajo.length === 0 ? (
                  <p className="text-secondary text-center m-0 py-4">
                    Sin alertas de stock.
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {datos.stockBajo.slice(0, 6).map((v) => (
                      <li
                        key={v.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div className="lh-sm">
                          <div className="fw-semibold">
                            {v.producto_nombre}
                          </div>
                          <small className="text-secondary">
                            {v.variante_nombre} &middot; min {v.stock_minimo}
                          </small>
                        </div>
                        <span
                          className={`badge bg-${
                            v.stock_actual <= 0 ? 'danger' : 'warning'
                          }`}
                        >
                          {v.stock_actual <= 0
                            ? 'Agotado'
                            : `${v.stock_actual} ${v.unidad_venta}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Productos mas vendidos */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Productos mas vendidos</h2>
              </div>
              <div className="card-body">
                {datos.topProductos.map((p, i) => {
                  const max = datos.topProductos[0].unidades || 1;
                  return (
                    <div
                      key={p.nombre}
                      className="d-flex align-items-center gap-3 mb-2"
                    >
                      <span className="fp-rank">{i + 1}</span>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold">{p.nombre}</span>
                          <span className="text-secondary">
                            {p.unidades} u. &middot; {formatCLP(p.monto)}
                          </span>
                        </div>
                        <div className="fp-bar-track">
                          <div
                            className="fp-bar-fill"
                            style={{
                              width: `${(p.unidades / max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
