/**
 * ReportesPage.jsx
 * ---------------------------------------------------------------------------
 * Reportes: agregaciones calculadas en vivo sobre las ventas, el inventario
 * y los movimientos de stock.
 *
 *   - Ventas por metodo de pago.
 *   - Productos mas vendidos (por unidades).
 *   - Valor del inventario por categoria.
 *   - Ultimos movimientos de inventario.
 * ---------------------------------------------------------------------------
 */
import { useMemo } from 'react';
import {
  getVentas,
  getDetalleVentasGlobal,
  getVariantesInventario,
  getCategorias,
  getMovimientos,
} from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { formatCLP, formatFechaHora } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';

// Color del badge segun tipo de movimiento.
const COLOR_MOVIMIENTO = {
  VENTA: 'danger',
  INGRESO_PROVEEDOR: 'success',
  AJUSTE_MERMA: 'warning',
  CARGA_INICIAL: 'secondary',
};

/** Barra horizontal de progreso reutilizable dentro de los reportes. */
function Barra({ etiqueta, detalle, valor, max, color = 'primary' }) {
  const ancho = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between small">
        <span className="fw-semibold">{etiqueta}</span>
        <span className="text-secondary">{detalle}</span>
      </div>
      <div className="fp-bar-track">
        <div
          className={`fp-bar-fill bg-${color}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const { data: ventas = [] } = useQuery(getVentas);
  const { data: detalle = [] } = useQuery(getDetalleVentasGlobal);
  const { data: variantes = [] } = useQuery(getVariantesInventario);
  const { data: categorias = [] } = useQuery(getCategorias);
  const { data: movimientosRaw = [] } = useQuery(getMovimientos);


  const reportes = useMemo(() => {
    // --- Ventas por metodo de pago ---
    const porMetodo = {};
    for (const v of ventas) {
      porMetodo[v.metodo_pago] = porMetodo[v.metodo_pago] || {
        metodo: v.metodo_pago,
        cantidad: 0,
        monto: 0,
      };
      porMetodo[v.metodo_pago].cantidad += 1;
      porMetodo[v.metodo_pago].monto += v.total;
    }
    const ventasPorMetodo = Object.values(porMetodo).sort(
      (a, b) => b.monto - a.monto,
    );

    // --- Productos mas vendidos (por unidades) ---
    const porProducto = new Map();
    for (const linea of detalle) {
      const item = porProducto.get(linea.producto_nombre) || {
        nombre: linea.producto_nombre,
        unidades: 0,
        monto: 0,
      };
      item.unidades += linea.cantidad;
      item.monto += linea.subtotal;
      porProducto.set(linea.producto_nombre, item);
    }
    const topProductos = [...porProducto.values()]
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 6);

    // --- Valor del inventario por categoria (a precio de costo) ---
    const porCategoria = categorias.map((cat) => ({
      nombre: cat.nombre,
      valor: variantes
        .filter((v) => v.categoria_id === cat.id)
        .reduce((s, v) => s + v.valor_stock, 0),
    }));
    porCategoria.sort((a, b) => b.valor - a.valor);

    return {
      ventasPorMetodo,
      totalVentas: ventas.reduce((s, v) => s + v.total, 0),
      topProductos,
      porCategoria,
      valorInventario: variantes.reduce((s, v) => s + v.valor_stock, 0),
      movimientos: movimientosRaw.slice(0, 8),
    };
  }, [ventas, detalle, variantes, categorias, movimientosRaw]);

  const maxMetodo = Math.max(
    ...reportes.ventasPorMetodo.map((m) => m.monto),
    1,
  );
  const maxProducto = Math.max(
    ...reportes.topProductos.map((p) => p.unidades),
    1,
  );
  const maxCategoria = Math.max(
    ...reportes.porCategoria.map((c) => c.valor),
    1,
  );

  return (
    <>
      <PageHeader
        titulo="Reportes"
        icono="bi-file-earmark-bar-graph"
        descripcion="Analisis de ventas e inventario"
      />

      <div className="fp-page-body">
        <div className="row g-3">
          {/* Ventas por metodo de pago */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Ventas por metodo de pago</h2>
              </div>
              <div className="card-body">
                {reportes.ventasPorMetodo.map((m) => (
                  <Barra
                    key={m.metodo}
                    etiqueta={m.metodo}
                    detalle={`${m.cantidad} venta(s) - ${formatCLP(m.monto)}`}
                    valor={m.monto}
                    max={maxMetodo}
                    color="primary"
                  />
                ))}
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total general</span>
                  <span>{formatCLP(reportes.totalVentas)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Productos mas vendidos */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Productos mas vendidos</h2>
              </div>
              <div className="card-body">
                {reportes.topProductos.map((p) => (
                  <Barra
                    key={p.nombre}
                    etiqueta={p.nombre}
                    detalle={`${p.unidades} u. - ${formatCLP(p.monto)}`}
                    valor={p.unidades}
                    max={maxProducto}
                    color="success"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Valor del inventario por categoria */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Valor de inventario por categoria</h2>
              </div>
              <div className="card-body">
                {reportes.porCategoria.map((c) => (
                  <Barra
                    key={c.nombre}
                    etiqueta={c.nombre}
                    detalle={formatCLP(c.valor)}
                    valor={c.valor}
                    max={maxCategoria}
                    color="warning"
                  />
                ))}
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Valor total (costo)</span>
                  <span>{formatCLP(reportes.valorInventario)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ultimos movimientos de inventario */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 m-0">Ultimos movimientos de inventario</h2>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle m-0">
                  <thead className="table-light">
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th className="text-end">Cantidad</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.producto_nombre}
                          <small className="text-secondary">
                            {' '}
                            {m.variante_nombre}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`badge bg-${
                              COLOR_MOVIMIENTO[m.tipo_movimiento] ||
                              'secondary'
                            }`}
                          >
                            {m.tipo_movimiento.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end">{m.cantidad}</td>
                        <td className="text-nowrap text-secondary">
                          {formatFechaHora(m.creado_en)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
