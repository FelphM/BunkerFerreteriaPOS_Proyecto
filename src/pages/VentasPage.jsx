/**
 * VentasPage.jsx
 * ---------------------------------------------------------------------------
 * Historial de ventas: listado con busqueda y filtro por metodo de pago,
 * indicadores del periodo y modal con el detalle de cada venta.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import { getVentas, getDetalleVenta } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import {
  formatCLP,
  formatFechaHora,
  esHoy,
  esMesActual,
} from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';

// Color del badge segun metodo de pago.
const COLOR_PAGO = {
  Efectivo: 'success',
  Transferencia: 'primary',
  Transbank: 'info',
};

export default function VentasPage() {
  const { data: ventas = [] } = useQuery(getVentas);

  const [busqueda, setBusqueda] = useState('');
  const [metodo, setMetodo] = useState('');
  const [ventaSel, setVentaSel] = useState(null);

  function handlePrintVenta() {
    if (!ventaSel || detalle.length === 0) return;
    const fecha = formatFechaHora(ventaSel.creado_en);
    const lineas = detalle.map((d) => `
      <tr>
        <td>${d.producto_nombre}${d.variante_nombre ? ` <small style="color:#666">${d.variante_nombre}</small>` : ''}</td>
        <td style="text-align:right">${d.cantidad} ${d.unidad_venta}</td>
        <td style="text-align:right">${formatCLP(d.precio_unitario)}</td>
        <td style="text-align:right"><strong>${formatCLP(d.subtotal)}</strong></td>
      </tr>`).join('');
    const w = window.open('', '_blank', 'width=700,height=800');
    w.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Venta #${ventaSel.numero_venta}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;padding:24px;color:#111}
  h2{margin-bottom:6px}
  .meta{color:#555;margin-bottom:16px;line-height:1.8}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f0f0f0;padding:7px 10px;text-align:left;border-bottom:2px solid #ccc}
  td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}
  .total-row td{font-weight:bold;border-top:2px solid #ccc;font-size:14px}
  @media print{body{padding:0}}
</style></head><body>
<h2>Venta #${String(ventaSel.numero_venta).padStart(6, '0')}</h2>
<div class="meta">
  <div><strong>Cliente:</strong> ${ventaSel.nombre_cliente}</div>
  ${ventaSel.rut_cliente ? `<div><strong>RUT:</strong> ${ventaSel.rut_cliente}</div>` : ''}
  <div><strong>Fecha:</strong> ${fecha}</div>
  <div><strong>Método de pago:</strong> ${ventaSel.metodo_pago}</div>
  ${ventaSel.observaciones ? `<div><strong>Observaciones:</strong> ${ventaSel.observaciones}</div>` : ''}
</div>
<table>
  <thead><tr><th>Producto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">P. Unitario</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${lineas}</tbody>
  <tfoot><tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${formatCLP(ventaSel.total)}</td></tr></tfoot>
</table>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  }

  // Detalle de la venta abierta en el modal (DEBE ir despues de ventaSel).
  const { data: detalle = [] } = useQuery(
    () => ventaSel ? getDetalleVenta(ventaSel.id) : Promise.resolve([]),
    [ventaSel?.id],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ventas.filter((v) => {
      const coincideTexto =
        !q ||
        v.nombre_cliente.toLowerCase().includes(q) ||
        String(v.numero_venta).includes(q) ||
        (v.rut_cliente || '').toLowerCase().includes(q);
      const coincideMetodo = !metodo || v.metodo_pago === metodo;
      return coincideTexto && coincideMetodo;
    });
  }, [ventas, busqueda, metodo]);

  const kpis = useMemo(() => {
    const hoy = ventas.filter((v) => esHoy(v.creado_en));
    const mes = ventas.filter((v) => esMesActual(v.creado_en));
    const totalMes = mes.reduce((s, v) => s + v.total, 0);
    return {
      countHoy: hoy.length,
      totalHoy: hoy.reduce((s, v) => s + v.total, 0),
      totalMes,
      ticket: mes.length ? totalMes / mes.length : 0,
    };
  }, [ventas]);


  return (
    <>
      <PageHeader
        titulo="Ventas"
        icono="bi-graph-up-arrow"
        descripcion={`${ventas.length} ventas registradas`}
      />

      <div className="fp-page-body">
        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ventas hoy"
              valor={kpis.countHoy}
              subtitulo={formatCLP(kpis.totalHoy)}
              icono="bi-receipt"
              color="success"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Total del mes"
              valor={formatCLP(kpis.totalMes)}
              icono="bi-cash-stack"
              color="primary"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Ticket promedio"
              valor={formatCLP(kpis.ticket)}
              subtitulo="del mes"
              icono="bi-tag"
              color="info"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Total historico"
              valor={formatCLP(ventas.reduce((s, v) => s + v.total, 0))}
              icono="bi-bar-chart"
              color="secondary"
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
                placeholder="Buscar por cliente, RUT o N. de venta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="form-select form-select-sm w-auto"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
            >
              <option value="">Todos los metodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Transbank">Transbank</option>
            </select>
            <span className="ms-auto small text-secondary">
              {filtradas.length} resultado(s)
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>N. Venta</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Metodo de pago</th>
                  <th className="text-end">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary py-4">
                      Sin ventas para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((v) => (
                    <tr key={v.id}>
                      <td className="fw-semibold">#{v.numero_venta}</td>
                      <td>
                        <div className="text-nowrap">{v.nombre_cliente}</div>
                        {v.rut_cliente && (
                          <small className="text-secondary">
                            {v.rut_cliente}
                          </small>
                        )}
                      </td>
                      <td className="text-nowrap text-secondary">
                        {formatFechaHora(v.creado_en)}
                      </td>
                      <td>
                        <span
                          className={`badge bg-${
                            COLOR_PAGO[v.metodo_pago] || 'secondary'
                          }`}
                        >
                          {v.metodo_pago}
                        </span>
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {formatCLP(v.total)}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary text-nowrap"
                          onClick={() => setVentaSel(v)}
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

      {/* Modal: detalle de venta */}
      <Modal
        show={ventaSel !== null}
        onClose={() => setVentaSel(null)}
        titulo={ventaSel ? `Venta #${ventaSel.numero_venta}` : ''}
        icono="bi-receipt"
        size="lg"
        footer={
          <div className="d-flex gap-2 w-100 justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setVentaSel(null)}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handlePrintVenta}
              disabled={detalle.length === 0}
            >
              <i className="bi bi-printer me-1" />Imprimir
            </button>
          </div>
        }
      >
        {ventaSel && (
          <>
            {/* Cabecera de la venta */}
            <div className="row g-2 mb-3 small">
              <div className="col-sm-6">
                <span className="text-secondary">Cliente: </span>
                <strong>{ventaSel.nombre_cliente}</strong>
              </div>
              <div className="col-sm-6">
                <span className="text-secondary">RUT: </span>
                {ventaSel.rut_cliente || '-'}
              </div>
              <div className="col-sm-6">
                <span className="text-secondary">Fecha: </span>
                {formatFechaHora(ventaSel.creado_en)}
              </div>
              <div className="col-sm-6">
                <span className="text-secondary">Metodo de pago: </span>
                {ventaSel.metodo_pago}
              </div>
              {ventaSel.observaciones && (
                <div className="col-12">
                  <span className="text-secondary">Observaciones: </span>
                  {ventaSel.observaciones}
                </div>
              )}
            </div>

            {/* Lineas de detalle */}
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
                    {formatCLP(ventaSel.total)}
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
