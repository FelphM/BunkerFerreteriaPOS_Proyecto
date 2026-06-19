import { useEffect, useMemo, useState } from 'react';
import { getFacturas, getProveedores } from '../data/queries';
import { useQuery } from '../hooks/useQuery';
import { supabase } from '../lib/supabaseClient';
import { formatCLP, formatFecha } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import NuevaFacturaModal, { CONDICIONES_PAGO, labelCondicion } from '../components/NuevaFacturaModal';

// ---------------------------------------------------------------------------
// Helpers de fecha (sin problemas de timezone)
// ---------------------------------------------------------------------------
function parseFechaLocal(str) {
  if (!str) return null;
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDias(dateStr, dias) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const f = new Date(y, m - 1, d + dias);
  return toDateKey(f);
}

const HOY = (() => {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
})();

function calcDias(vencStr) {
  const venc = parseFechaLocal(vencStr);
  return Math.ceil((venc - HOY) / 86400000);
}

function estadoVisual(f, diasAlerta) {
  if (['PAGADA', 'ANULADA'].includes(f.estado_pago)) return f.estado_pago.toLowerCase();
  if (!f.fecha_vencimiento) return 'al_dia';
  const d = calcDias(f.fecha_vencimiento);
  if (d < 0) return 'vencida';
  if (d <= diasAlerta) return 'por_vencer';
  return 'al_dia';
}

// ---------------------------------------------------------------------------
// Mini Calendario
// ---------------------------------------------------------------------------
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const PRIORIDAD = { vencida: 3, por_vencer: 2, al_dia: 1 };

function MiniCalendario({ facturas, diasAlerta, filtroDia, onFiltroDia }) {
  const [mesVista, setMesVista] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  const diasConFacturas = useMemo(() => {
    const mapa = new Map();
    for (const f of facturas) {
      if (!f.fecha_vencimiento) continue;
      if (['PAGADA', 'ANULADA'].includes(f.estado_pago)) continue;
      const key = f.fecha_vencimiento;
      const ev = estadoVisual(f, diasAlerta);
      const prev = mapa.get(key);
      mapa.set(key, {
        ev: !prev || PRIORIDAD[ev] > PRIORIDAD[prev.ev] ? ev : prev.ev,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return mapa;
  }, [facturas, diasAlerta]);

  const anio = mesVista.getFullYear();
  const mes = mesVista.getMonth();
  const primerDia = new Date(anio, mes, 1).getDay();
  const inicioLunes = (primerDia + 6) % 7;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const totalCeldas = Math.ceil((inicioLunes + ultimoDia) / 7) * 7;

  const mesLabel = mesVista.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <div className="fp-calendario">
      <div className="fp-cal-nav">
        <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2"
          onClick={() => setMesVista(new Date(anio, mes - 1, 1))}>
          <i className="bi bi-chevron-left" />
        </button>
        <span className="fp-cal-mes-label text-capitalize">{mesLabel}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2"
          onClick={() => setMesVista(new Date(anio, mes + 1, 1))}>
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="fp-cal-grid">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="fp-cal-dia-label">{d}</div>
        ))}

        {Array.from({ length: totalCeldas }, (_, i) => {
          const numDia = i - inicioLunes + 1;
          if (numDia < 1 || numDia > ultimoDia) {
            return <div key={i} className="fp-cal-vacio" />;
          }
          const key = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(numDia).padStart(2, '0')}`;
          const fLocal = parseFechaLocal(key);
          const esHoyDia = fLocal.getTime() === HOY.getTime();
          const entry = diasConFacturas.get(key);
          const ev = entry?.ev;
          const count = entry?.count ?? 0;
          const esSel = filtroDia === key;

          return (
            <button
              key={i}
              type="button"
              className={[
                'fp-cal-dia',
                esHoyDia && 'fp-cal-hoy',
                ev === 'vencida' && 'fp-cal-vencida',
                ev === 'por_vencer' && 'fp-cal-proxima',
                ev === 'al_dia' && 'fp-cal-al-dia',
                esSel && 'fp-cal-sel',
              ].filter(Boolean).join(' ')}
              onClick={() => onFiltroDia(esSel ? null : key)}
              title={count > 0 ? `${numDia}: ${count} factura${count > 1 ? 's' : ''}` : undefined}
            >
              {numDia}
              {count > 0 && <span className="fp-cal-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtroDia && (
        <div className="mt-2 text-center small">
          <span className="text-secondary">
            Filtrando: {formatFecha(parseFechaLocal(filtroDia))}
          </span>
          {' · '}
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => onFiltroDia(null)}>
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Editar Factura
// ---------------------------------------------------------------------------
function EditarFacturaModal({ factura, proveedores, onClose, onEditada }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!factura) return;
    setForm({
      proveedor_id: factura.proveedor_id,
      numero_factura: factura.numero_factura,
      fecha_emision: factura.fecha_emision,
      condicion_pago: factura.condicion_pago,
      monto: String(factura.monto),
      observaciones: factura.observaciones || '',
    });
    setError('');
  }, [factura]);

  if (!form || !factura) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const dias = CONDICIONES_PAGO.find((c) => c.value === form.condicion_pago)?.dias ?? 0;
  const esCredito = dias > 0;
  const fechaVenc = form.fecha_emision ? addDias(form.fecha_emision, dias) : '';
  const fechaVencDisplay = form.fecha_emision
    ? esCredito ? formatFecha(new Date(fechaVenc + 'T12:00:00')) : 'mismo día de emisión'
    : '—';

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError('');
  }

  async function handleGuardar() {
    if (!form.proveedor_id) return setError('Selecciona un proveedor.');
    if (!form.numero_factura.trim()) return setError('Ingresa el número de factura.');
    if (form.fecha_emision > hoy) return setError('La fecha de emisión no puede ser futura.');
    if (!form.monto || Number(form.monto) <= 0) return setError('El monto debe ser mayor a 0.');

    setGuardando(true);
    try {
      const { error: err } = await supabase
        .from('facturas_proveedores')
        .update({
          proveedor_id: form.proveedor_id,
          numero_factura: form.numero_factura.trim().toUpperCase(),
          fecha_emision: form.fecha_emision,
          fecha_vencimiento: fechaVenc || null,
          condicion_pago: form.condicion_pago,
          monto: Number(form.monto),
          observaciones: form.observaciones.trim() || null,
        })
        .eq('id', factura.id);
      if (err) {
        if (err.code === '23505') throw new Error('Ya existe una factura con ese número para este proveedor.');
        throw new Error(err.message);
      }
      onEditada();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal show onClose={onClose} titulo="Editar factura" icono="bi-pencil-square" size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="button" className="btn fp-btn-accent" onClick={handleGuardar} disabled={guardando}>
            {guardando
              ? <><span className="spinner-border spinner-border-sm me-1" />Guardando...</>
              : <><i className="bi bi-check-lg me-1" />Guardar cambios</>}
          </button>
        </>
      }
    >
      {error && (
        <div className="alert alert-danger py-2 mb-3 small">
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label fw-semibold">Proveedor <span className="text-danger">*</span></label>
          <select className="form-select" value={form.proveedor_id} onChange={(e) => set('proveedor_id', e.target.value)}>
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-semibold">N° Factura <span className="text-danger">*</span></label>
          <input type="text" className="form-control" value={form.numero_factura}
            onChange={(e) => set('numero_factura', e.target.value)} />
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-semibold">Fecha de emisión <span className="text-danger">*</span></label>
          <input type="date" className="form-control" max={hoy} value={form.fecha_emision}
            onChange={(e) => set('fecha_emision', e.target.value)} />
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-semibold">Condición de pago</label>
          <select className="form-select" value={form.condicion_pago} onChange={(e) => set('condicion_pago', e.target.value)}>
            {CONDICIONES_PAGO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="col-sm-6">
          <div className="h-100 d-flex align-items-end">
            <div className="alert alert-secondary py-2 px-3 mb-0 w-100 d-flex align-items-center gap-2">
              <i className="bi bi-calendar-event text-primary flex-shrink-0" />
              <span className="small">
                {esCredito
                  ? <>Vence el <strong>{fechaVencDisplay}</strong></>
                  : <>Vence <strong>{fechaVencDisplay}</strong></>}
              </span>
            </div>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold">Monto (CLP) <span className="text-danger">*</span></label>
          <input type="number" className="form-control" min="1" value={form.monto}
            onChange={(e) => set('monto', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold">Observaciones</label>
          <textarea className="form-control" rows={2} value={form.observaciones}
            onChange={(e) => set('observaciones', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Constantes de presentación
// ---------------------------------------------------------------------------
const ROW_CLASE = {
  vencida: 'table-danger',
  por_vencer: 'table-warning',
  al_dia: '',
  pagada: '',
  anulada: '',
};

const BADGE_COLOR = {
  vencida: 'danger',
  por_vencer: 'warning',
  al_dia: 'success',
  pagada: 'success',
  anulada: 'secondary',
};

const BADGE_LABEL = {
  vencida: 'Vencida',
  por_vencer: 'Por vencer',
  al_dia: 'Al día',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function FacturasPage() {
  const { data: facturas = [], refetch } = useQuery(getFacturas);
  const { data: proveedores = [] } = useQuery(getProveedores);

  const [showNueva, setShowNueva] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroDia, setFiltroDia] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [diasAlerta, setDiasAlerta] = useState(() => {
    const saved = localStorage.getItem('fp_dias_alerta');
    return saved ? Math.max(1, Math.min(90, Number(saved))) : 7;
  });
  const [cargando, setCargando] = useState(null);

  const facturasEnriquecidas = useMemo(() =>
    facturas.map((f) => ({
      ...f,
      ev: estadoVisual(f, diasAlerta),
      diasRestantes: !['PAGADA', 'ANULADA'].includes(f.estado_pago) && f.fecha_vencimiento
        ? calcDias(f.fecha_vencimiento)
        : null,
    })),
  [facturas, diasAlerta]);

  const kpis = useMemo(() => {
    const activas = facturasEnriquecidas.filter((f) => !['PAGADA', 'ANULADA'].includes(f.estado_pago));
    return {
      totalPendiente: activas.reduce((s, f) => s + f.monto, 0),
      countVencidas: facturasEnriquecidas.filter((f) => f.ev === 'vencida').length,
      countPorVencer: facturasEnriquecidas.filter((f) => f.ev === 'por_vencer').length,
      countActivas: activas.length,
    };
  }, [facturasEnriquecidas]);

  const filtradas = useMemo(() => {
    let lista = facturasEnriquecidas;
    if (filtroEstado === 'activos') lista = lista.filter((f) => !['PAGADA', 'ANULADA'].includes(f.estado_pago));
    else if (filtroEstado === 'vencidas') lista = lista.filter((f) => f.ev === 'vencida');
    else if (filtroEstado === 'por_vencer') lista = lista.filter((f) => f.ev === 'por_vencer');
    else if (filtroEstado === 'pagadas') lista = lista.filter((f) => f.estado_pago === 'PAGADA');
    if (filtroProveedor) lista = lista.filter((f) => f.proveedor_id === filtroProveedor);
    if (filtroDia) lista = lista.filter((f) => f.fecha_vencimiento === filtroDia);
    return lista;
  }, [facturasEnriquecidas, filtroEstado, filtroProveedor, filtroDia]);

  async function marcarPagada(f) {
    if (!window.confirm(`¿Marcar la factura "${f.numero_factura}" de ${f.proveedor_nombre} como pagada?`)) return;
    setCargando(f.id);
    try {
      const fecha_pago = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from('facturas_proveedores')
        .update({ estado_pago: 'PAGADA', fecha_pago })
        .eq('id', f.id);
      if (error) throw new Error(error.message);
      refetch();
      window.dispatchEvent(new Event('fp:facturas-changed'));
    } catch (err) {
      window.alert(`Error: ${err.message}`);
    } finally {
      setCargando(null);
    }
  }

  async function anularFactura(f) {
    if (!window.confirm(`¿Anular la factura "${f.numero_factura}"?\nEsto cambia el estado a Anulada. El registro no se elimina.`)) return;
    setCargando(f.id);
    try {
      const { error } = await supabase
        .from('facturas_proveedores')
        .update({ estado_pago: 'ANULADA' })
        .eq('id', f.id);
      if (error) throw new Error(error.message);
      refetch();
      window.dispatchEvent(new Event('fp:facturas-changed'));
    } catch (err) {
      window.alert(`Error: ${err.message}`);
    } finally {
      setCargando(null);
    }
  }

  return (
    <>
      <PageHeader titulo="Facturas de Proveedores" icono="bi-receipt" descripcion="Control de cuentas por pagar y vencimientos">
        <button type="button" className="btn fp-btn-accent" onClick={() => setShowNueva(true)}>
          <i className="bi bi-plus-lg me-1" />Nueva factura
        </button>
      </PageHeader>

      <div className="fp-page-body">
        {/* Alerta de vencidas */}
        {kpis.countVencidas > 0 && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
            <i className="bi bi-exclamation-octagon-fill fs-5 flex-shrink-0" />
            <div>
              <strong>{kpis.countVencidas} factura{kpis.countVencidas > 1 ? 's' : ''} vencida{kpis.countVencidas > 1 ? 's' : ''}.</strong>
              {' '}
              <button type="button" className="btn btn-sm btn-link p-0 align-baseline"
                onClick={() => { setFiltroEstado('vencidas'); setFiltroDia(null); }}>
                Ver vencidas →
              </button>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Total por pagar" valor={formatCLP(kpis.totalPendiente)} icono="bi-cash-stack" color="primary" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Vencidas" valor={kpis.countVencidas} icono="bi-exclamation-octagon" color="danger" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo={`Por vencer (≤${diasAlerta}d)`} valor={kpis.countPorVencer} icono="bi-clock-history" color="warning" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Activas" valor={kpis.countActivas} icono="bi-hourglass-split" color="info" />
          </div>
        </div>

        {/* Calendario + tabla */}
        <div className="row g-3">
          {/* Calendario */}
          <div className="col-lg-3">
            <div className="card border-0 shadow-sm p-3">
              <MiniCalendario
                facturas={facturasEnriquecidas}
                diasAlerta={diasAlerta}
                filtroDia={filtroDia}
                onFiltroDia={setFiltroDia}
              />

              {/* Leyenda */}
              <div className="mt-3 d-flex flex-column gap-1">
                <div className="small fw-semibold text-secondary mb-1">Leyenda</div>
                {[
                  { cls: 'fp-cal-vencida', label: 'Vencida' },
                  { cls: 'fp-cal-proxima', label: 'Por vencer' },
                  { cls: 'fp-cal-al-dia', label: 'Al día' },
                ].map(({ cls, label }) => (
                  <div key={label} className="d-flex align-items-center gap-2 small">
                    <span className={`fp-cal-legend-dot ${cls}`} />
                    {label}
                  </div>
                ))}
              </div>

              {/* Configurar días alerta */}
              <div className="mt-3">
                <label className="form-label small fw-semibold mb-1">Días de alerta</label>
                <div className="input-group input-group-sm">
                  <input type="number" className="form-control" min="1" max="90"
                    value={diasAlerta}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(90, Number(e.target.value) || 7));
                      setDiasAlerta(v);
                      localStorage.setItem('fp_dias_alerta', String(v));
                    }} />
                  <span className="input-group-text">días</span>
                </div>
                <div className="form-text">Rango para "Por vencer"</div>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="col-lg-9">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
                <select className="form-select form-select-sm" style={{ maxWidth: 160 }}
                  value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="activos">Activas</option>
                  <option value="vencidas">Vencidas</option>
                  <option value="por_vencer">Por vencer</option>
                  <option value="pagadas">Pagadas</option>
                  <option value="todos">Todas</option>
                </select>
                <select className="form-select form-select-sm" style={{ maxWidth: 200 }}
                  value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
                  <option value="">Todos los proveedores</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {(filtroDia || filtroProveedor || filtroEstado !== 'activos') && (
                  <button type="button" className="btn btn-sm btn-outline-secondary"
                    onClick={() => { setFiltroEstado('activos'); setFiltroProveedor(''); setFiltroDia(null); }}>
                    <i className="bi bi-x-lg me-1" />Limpiar
                  </button>
                )}
                <span className="ms-auto small text-secondary">{filtradas.length} resultado(s)</span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle m-0">
                  <thead className="table-light">
                    <tr className="text-nowrap">
                      <th>Proveedor</th>
                      <th>N° Factura</th>
                      <th>Emisión</th>
                      <th>Vencimiento</th>
                      <th>Plazo</th>
                      <th className="text-end">Monto</th>
                      <th>Pago</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center text-secondary py-4">
                          Sin facturas para los filtros actuales.
                        </td>
                      </tr>
                    ) : filtradas.map((f) => (
                      <tr key={f.id} className={ROW_CLASE[f.ev] || ''}>
                        <td className="fw-semibold text-nowrap">{f.proveedor_nombre}</td>
                        <td className="text-nowrap">{f.numero_factura}</td>
                        <td className="text-nowrap text-secondary">
                          {formatFecha(parseFechaLocal(f.fecha_emision))}
                        </td>
                        <td className="text-nowrap">
                          {formatFecha(parseFechaLocal(f.fecha_vencimiento))}
                        </td>
                        <td>
                          {f.diasRestantes !== null && (
                            f.diasRestantes < 0
                              ? <span className="badge bg-danger">{Math.abs(f.diasRestantes)}d vencida</span>
                              : f.diasRestantes === 0
                                ? <span className="badge bg-warning text-dark">Vence hoy</span>
                                : f.diasRestantes <= diasAlerta
                                  ? <span className="badge bg-warning text-dark">{f.diasRestantes}d</span>
                                  : <span className="badge bg-secondary">{f.diasRestantes}d</span>
                          )}
                        </td>
                        <td className="text-end fw-semibold text-nowrap">{formatCLP(f.monto)}</td>
                        <td className="text-nowrap"><small>{labelCondicion(f.condicion_pago)}</small></td>
                        <td>
                          <span className={`badge bg-${BADGE_COLOR[f.ev] || 'secondary'}`}>
                            {BADGE_LABEL[f.ev] ?? f.estado_pago}
                          </span>
                        </td>
                        <td className="text-end">
                          {cargando === f.id
                            ? <span className="spinner-border spinner-border-sm text-secondary" />
                            : !['PAGADA', 'ANULADA'].includes(f.estado_pago) && (
                              <div className="d-flex gap-1 justify-content-end">
                                <button type="button" className="btn btn-sm btn-outline-success"
                                  title="Marcar como pagada" onClick={() => marcarPagada(f)}>
                                  <i className="bi bi-check-lg" />
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-primary"
                                  title="Editar" onClick={() => setEditando(f)}>
                                  <i className="bi bi-pencil" />
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-secondary"
                                  title="Anular" onClick={() => anularFactura(f)}>
                                  <i className="bi bi-x-circle" />
                                </button>
                              </div>
                            )
                          }
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

      <NuevaFacturaModal
        show={showNueva}
        proveedores={proveedores}
        onClose={() => setShowNueva(false)}
        onCreada={() => { setShowNueva(false); refetch(); window.dispatchEvent(new Event('fp:facturas-changed')); }}
      />

      <EditarFacturaModal
        factura={editando}
        proveedores={proveedores}
        onClose={() => setEditando(null)}
        onEditada={() => { setEditando(null); refetch(); window.dispatchEvent(new Event('fp:facturas-changed')); }}
      />
    </>
  );
}
