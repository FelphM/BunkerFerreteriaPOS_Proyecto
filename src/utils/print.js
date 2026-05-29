/**
 * print.js
 * ---------------------------------------------------------------------------
 * Utilidad para imprimir cotizaciones abriendo una ventana nueva con HTML
 * formateado. No depende del CSS de la app principal.
 * ---------------------------------------------------------------------------
 */

function formatCLPLocal(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n ?? 0);
}

function fechaLarga(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function imprimirCotizacion(cotizacion) {
  const { fecha, cliente, notas, items, subtotal, iva, total } = cotizacion;

  const filas = items
    .map(
      (it) => `
      <tr>
        <td>${it.nombre}${it.sku ? `<br><small style="color:#666">${it.sku}</small>` : ''}</td>
        <td style="text-align:center">${it.cantidad}</td>
        <td style="text-align:right">${formatCLPLocal(it.precio_unitario)}</td>
        <td style="text-align:right;font-weight:600">${formatCLPLocal(it.cantidad * it.precio_unitario)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización — Bunker Ferreteria</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 32px; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #e8620e; padding-bottom: 16px; }
    .brand { font-size: 22px; font-weight: 800; color: #e8620e; }
    .brand small { display: block; font-size: 11px; font-weight: 400; color: #555; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 700; color: #333; }
    .doc-title .fecha { font-size: 11px; color: #666; margin-top: 4px; }

    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .meta-item label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .meta-item span { font-weight: 600; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #1d2536; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #fafafa; }

    .totales { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; padding-top: 12px; border-top: 2px solid #eee; }
    .totales .row { display: flex; justify-content: flex-end; gap: 32px; font-size: 12px; }
    .totales .row .label { color: #666; min-width: 120px; text-align: right; }
    .totales .row .value { min-width: 100px; text-align: right; font-weight: 600; }
    .totales .total-final { font-size: 16px; font-weight: 800; color: #e8620e; margin-top: 6px; }

    .footer { margin-top: 40px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }

    @media print {
      body { padding: 16px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      Bunker Ferreteria
      <small>Sistema de Punto de Venta</small>
    </div>
    <div class="doc-title">
      <h1>COTIZACIÓN</h1>
      <div class="fecha">${fechaLarga(fecha)}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <label>Cliente</label>
      <span>${cliente || '—'}</span>
    </div>
    ${notas ? `<div class="meta-item"><label>Notas</label><span>${notas}</span></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:center;width:70px">Cant.</th>
        <th style="text-align:right;width:120px">P. Unitario</th>
        <th style="text-align:right;width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="totales">
    <div class="row"><span class="label">Subtotal (neto)</span><span class="value">${formatCLPLocal(subtotal)}</span></div>
    <div class="row"><span class="label">IVA (19%)</span><span class="value">${formatCLPLocal(iva)}</span></div>
    <div class="total-final">Total: ${formatCLPLocal(total)}</div>
  </div>

  <div class="footer">
    Cotización generada por Bunker Ferreteria · Válida por 15 días desde la fecha de emisión.
  </div>

  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=700');
  if (!win) { window.alert('Permite las ventanas emergentes para imprimir.'); return; }
  win.document.write(html);
  win.document.close();
}
