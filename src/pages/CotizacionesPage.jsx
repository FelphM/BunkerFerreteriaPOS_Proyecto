/**
 * CotizacionesPage.jsx
 * ---------------------------------------------------------------------------
 * Vista completa de gestión de cotizaciones (localStorage: 'fp_cotizaciones').
 *
 * Modos:
 *   lista   → tabla general con KPIs
 *   detalle → información completa de una cotización (solo lectura)
 *   editar  → formulario para modificar cliente, notas e items
 * ---------------------------------------------------------------------------
 */
import { useState, useMemo } from 'react';
import { formatCLP, formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { leerCotizaciones, guardarCotizacion } from '../components/CotizacionesModal';
import { imprimirCotizacion } from '../utils/print';

const LS_KEY = 'fp_cotizaciones';

function persistir(lista) {
  localStorage.setItem(LS_KEY, JSON.stringify(lista));
}

function actualizarCotizacion(actualizada) {
  const lista = leerCotizaciones().map((c) =>
    c.id === actualizada.id ? actualizada : c,
  );
  persistir(lista);
}

function eliminarCotizacion(id) {
  persistir(leerCotizaciones().filter((c) => c.id !== id));
}

// ---------------------------------------------------------------------------

export default function CotizacionesPage() {
  const [tick, setTick] = useState(0);
  const [modo, setModo] = useState('lista'); // 'lista' | 'detalle' | 'editar'
  const [seleccionada, setSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const cotizaciones = useMemo(() => leerCotizaciones(), [tick]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return cotizaciones;
    return cotizaciones.filter(
      (c) =>
        (c.cliente || '').toLowerCase().includes(q) ||
        new Date(c.fecha).toLocaleDateString('es-CL').includes(q),
    );
  }, [cotizaciones, busqueda]);

  const kpis = useMemo(() => {
    const total = cotizaciones.reduce((s, c) => s + (c.total ?? 0), 0);
    return { cantidad: cotizaciones.length, total };
  }, [cotizaciones]);

  function refetch() { setTick((n) => n + 1); }

  function verDetalle(c) {
    setSeleccionada(c);
    setModo('detalle');
  }

  function irEditar(c) {
    setSeleccionada(c);
    setModo('editar');
  }

  function volver() {
    setSeleccionada(null);
    setModo('lista');
    refetch();
  }

  function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    eliminarCotizacion(id);
    refetch();
    if (modo !== 'lista') volver();
  }

  function handleGuardarEdicion(actualizada) {
    actualizarCotizacion(actualizada);
    setSeleccionada(actualizada);
    setModo('detalle');
    refetch();
  }

  // Breadcrumb title
  const subtitulo =
    modo === 'lista'
      ? `${kpis.cantidad} cotizacion(es) guardadas`
      : modo === 'editar'
      ? 'Editando cotización'
      : 'Detalle de cotización';

  return (
    <>
      <PageHeader titulo="Cotizaciones" icono="bi-file-earmark-text" descripcion={subtitulo}>
        {modo !== 'lista' && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={volver}>
            <i className="bi bi-arrow-left me-1" />
            Volver a la lista
          </button>
        )}
      </PageHeader>

      <div className="fp-page-body">
        {modo === 'lista' && (
          <ListaView
            cotizaciones={filtradas}
            kpis={kpis}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            onVer={verDetalle}
            onEditar={irEditar}
            onEliminar={handleEliminar}
          />
        )}
        {modo === 'detalle' && seleccionada && (
          <DetalleView
            cotizacion={seleccionada}
            onEditar={() => irEditar(seleccionada)}
            onEliminar={() => handleEliminar(seleccionada.id)}
          />
        )}
        {modo === 'editar' && seleccionada && (
          <EditarView
            cotizacion={seleccionada}
            onGuardar={handleGuardarEdicion}
            onCancelar={() => setModo('detalle')}
          />
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista: Lista

function ListaView({ cotizaciones, kpis, busqueda, onBusqueda, onVer, onEditar, onEliminar }) {
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-xl-4">
          <StatCard titulo="Cotizaciones" valor={kpis.cantidad} icono="bi-file-earmark-text" color="primary" />
        </div>
        <div className="col-sm-6 col-xl-4">
          <StatCard titulo="Valor total" valor={formatCLP(kpis.total)} icono="bi-cash-stack" color="success" />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group input-group-sm fp-filtro-busqueda">
            <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por cliente o fecha..."
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
            />
          </div>
          <span className="ms-auto small text-secondary">{cotizaciones.length} resultado(s)</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle m-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th className="text-center">Items</th>
                <th className="text-end">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cotizaciones.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-5">
                    <i className="bi bi-file-earmark-x fs-1 d-block mb-2 opacity-50" />
                    No hay cotizaciones guardadas.<br />
                    <small>Usa el botón &ldquo;Cotizar&rdquo; en el Punto de Venta.</small>
                  </td>
                </tr>
              ) : (
                cotizaciones.map((c, idx) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onVer(c)}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="text-nowrap">
                      {new Date(c.fecha).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>{c.cliente || <span className="text-muted">—</span>}</td>
                    <td className="text-center">
                      <span className="badge bg-secondary">{c.items.length}</span>
                    </td>
                    <td className="text-end fw-semibold">{formatCLP(c.total)}</td>
                    <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        onClick={() => onEditar(c)}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Eliminar"
                        onClick={() => onEliminar(c.id)}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista: Detalle

function DetalleView({ cotizacion, onEditar, onEliminar }) {
  const { fecha, cliente, notas, items, subtotal, iva, total } = cotizacion;

  return (
    <div className="row g-3">
      {/* Encabezado general */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">
              <i className="bi bi-info-circle me-2 text-warning" />
              Datos generales
            </span>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-dark"
                onClick={() => imprimirCotizacion(cotizacion)}>
                <i className="bi bi-printer me-1" />Imprimir
              </button>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={onEditar}>
                <i className="bi bi-pencil me-1" />Editar
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={onEliminar}>
                <i className="bi bi-trash3 me-1" />Eliminar
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-4">
                <small className="text-muted d-block mb-1">Fecha</small>
                <span>
                  {new Date(fecha).toLocaleString('es-CL', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="col-sm-4">
                <small className="text-muted d-block mb-1">Cliente</small>
                <span className="fw-semibold">{cliente || '—'}</span>
              </div>
              <div className="col-sm-4">
                <small className="text-muted d-block mb-1">Notas</small>
                <span>{notas || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de items */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">
            <i className="bi bi-list-ul me-2 text-warning" />
            Detalle de productos
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-end">P. Unit.</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td className="fw-semibold">{item.nombre}</td>
                    <td className="text-secondary">{item.sku || '—'}</td>
                    <td className="text-center">{item.cantidad}</td>
                    <td className="text-end">{formatCLP(item.precio_unitario)}</td>
                    <td className="text-end fw-semibold">
                      {formatCLP(item.cantidad * item.precio_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white">
            <div className="d-flex flex-column align-items-end gap-1">
              <div className="text-muted small">
                Subtotal (neto): <span className="text-body ms-2 fw-semibold">{formatCLP(subtotal)}</span>
              </div>
              <div className="text-muted small">
                IVA (19%): <span className="text-body ms-2 fw-semibold">{formatCLP(iva)}</span>
              </div>
              <div className="fw-bold fs-5 mt-1">
                Total: <span className="text-warning ms-2">{formatCLP(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista: Editar

function EditarView({ cotizacion, onGuardar, onCancelar }) {
  const [cliente, setCliente] = useState(cotizacion.cliente ?? '');
  const [notas, setNotas] = useState(cotizacion.notas ?? '');
  const [items, setItems] = useState(
    cotizacion.items.map((it) => ({ ...it })),
  );

  const IVA_PCT = 0.19;

  const totales = useMemo(() => {
    const subtotalBruto = items.reduce(
      (s, it) => s + it.cantidad * it.precio_unitario, 0,
    );
    const subtotal = Math.round(subtotalBruto / (1 + IVA_PCT));
    const iva = Math.round(subtotalBruto - subtotal);
    return { subtotal, iva, total: Math.round(subtotalBruto) };
  }, [items]);

  function setCantidad(idx, val) {
    const n = Math.max(0, Number(val) || 0);
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, cantidad: n } : it)));
  }

  function setPrecio(idx, val) {
    const n = Math.max(0, Number(val) || 0);
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, precio_unitario: n } : it)));
  }

  function eliminarItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleGuardar() {
    const sinCero = items.filter((it) => it.cantidad > 0);
    if (sinCero.length === 0) {
      window.alert('La cotización debe tener al menos un item con cantidad mayor a 0.');
      return;
    }
    onGuardar({
      ...cotizacion,
      cliente,
      notas,
      items: sinCero,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
    });
  }

  return (
    <div className="row g-3">
      {/* Datos generales */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">
            <i className="bi bi-pencil me-2 text-warning" />
            Datos generales
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label fw-semibold">Cliente</label>
                <input
                  type="text"
                  className="form-control"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="col-sm-6">
                <label className="form-label fw-semibold">Notas</label>
                <input
                  type="text"
                  className="form-control"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">
            <i className="bi bi-list-ul me-2 text-warning" />
            Productos
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th className="text-center" style={{ width: 110 }}>Cantidad</th>
                  <th className="text-end" style={{ width: 140 }}>P. Unit. ($)</th>
                  <th className="text-end">Subtotal</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td>
                      <div className="fw-semibold">{item.nombre}</div>
                      {item.sku && <small className="text-muted">{item.sku}</small>}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-center"
                        min="0"
                        step="1"
                        value={item.cantidad}
                        onChange={(e) => setCantidad(i, e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm text-end"
                        min="0"
                        step="1"
                        value={item.precio_unitario}
                        onChange={(e) => setPrecio(i, e.target.value)}
                      />
                    </td>
                    <td className="text-end fw-semibold">
                      {formatCLP(item.cantidad * item.precio_unitario)}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => eliminarItem(i)}
                        title="Quitar"
                      >
                        <i className="bi bi-x" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white">
            <div className="d-flex flex-column align-items-end gap-1">
              <div className="text-muted small">
                Subtotal (neto): <span className="text-body ms-2 fw-semibold">{formatCLP(totales.subtotal)}</span>
              </div>
              <div className="text-muted small">
                IVA (19%): <span className="text-body ms-2 fw-semibold">{formatCLP(totales.iva)}</span>
              </div>
              <div className="fw-bold fs-5 mt-1">
                Total: <span className="text-warning ms-2">{formatCLP(totales.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="col-12 d-flex justify-content-end gap-2 pb-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn fp-btn-accent" onClick={handleGuardar}>
          <i className="bi bi-check-lg me-1" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
