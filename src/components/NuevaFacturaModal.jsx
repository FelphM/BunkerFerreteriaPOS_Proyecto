import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './ui/Modal';
import { formatFecha } from '../utils/format';

export const CONDICIONES_PAGO = [
  { value: 'contra_entrega', label: 'Contra entrega',  dias: 0  },
  { value: '15_dias',        label: 'Crédito 15 días', dias: 15 },
  { value: '30_dias',        label: 'Crédito 30 días', dias: 30 },
  { value: '60_dias',        label: 'Crédito 60 días', dias: 60 },
];

export function labelCondicion(value) {
  return CONDICIONES_PAGO.find((c) => c.value === value)?.label ?? value;
}

function diasDeCondicion(value) {
  return CONDICIONES_PAGO.find((c) => c.value === value)?.dias ?? 0;
}

function addDias(dateStr, dias) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

const VACIO = {
  proveedor_id: '',
  numero_factura: '',
  fecha_emision: '',
  condicion_pago: '30_dias',
  monto: '',
  observaciones: '',
};

export default function NuevaFacturaModal({ show, proveedores = [], onClose, onCreada }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (show) {
      const hoy = new Date().toISOString().slice(0, 10);
      setForm({ ...VACIO, fecha_emision: hoy });
      setError('');
    }
  }, [show]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError('');
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const dias = diasDeCondicion(form.condicion_pago ?? '30_dias');
  const esCredito = dias > 0;
  const fechaVenc = form.fecha_emision ? addDias(form.fecha_emision, dias) : '';
  const fechaVencDisplay = form.fecha_emision
    ? esCredito
      ? formatFecha(new Date(fechaVenc + 'T12:00:00'))
      : 'mismo día de emisión'
    : '—';

  async function handleGuardar() {
    if (!form.proveedor_id) return setError('Selecciona un proveedor.');
    if (!form.numero_factura.trim()) return setError('Ingresa el número de factura.');
    if (!form.fecha_emision) return setError('Ingresa la fecha de emisión.');
    if (form.fecha_emision > hoy) return setError('La fecha de emisión no puede ser futura.');
    if (!form.monto || Number(form.monto) <= 0) return setError('El monto debe ser mayor a 0.');

    setGuardando(true);
    try {
      const { error: err } = await supabase.from('facturas_proveedores').insert({
        proveedor_id: form.proveedor_id,
        numero_factura: form.numero_factura.trim().toUpperCase(),
        fecha_emision: form.fecha_emision,
        fecha_vencimiento: fechaVenc || null,
        condicion_pago: form.condicion_pago,
        monto: Number(form.monto),
        observaciones: form.observaciones.trim() || null,
        estado_pago: 'PENDIENTE',
      });
      if (err) {
        if (err.code === '23505') throw new Error('Ya existe una factura con ese número para este proveedor.');
        throw new Error(err.message);
      }
      onCreada();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>
        Cancelar
      </button>
      <button type="button" className="btn fp-btn-accent" onClick={handleGuardar} disabled={guardando}>
        {guardando
          ? <><span className="spinner-border spinner-border-sm me-1" />Registrando...</>
          : <><i className="bi bi-plus-lg me-1" />Registrar factura</>}
      </button>
    </>
  );

  return (
    <Modal show={show} onClose={onClose} titulo="Nueva factura de proveedor" icono="bi-receipt" size="lg" footer={footer}>
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
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div className="col-sm-6">
          <label className="form-label fw-semibold">N° Factura <span className="text-danger">*</span></label>
          <input type="text" className="form-control" placeholder="Ej: 000123"
            value={form.numero_factura} onChange={(e) => set('numero_factura', e.target.value)} />
        </div>

        <div className="col-sm-6">
          <label className="form-label fw-semibold">Fecha de emisión <span className="text-danger">*</span></label>
          <input type="date" className="form-control" max={hoy}
            value={form.fecha_emision} onChange={(e) => set('fecha_emision', e.target.value)} />
        </div>

        <div className="col-sm-6">
          <label className="form-label fw-semibold">Condición de pago <span className="text-danger">*</span></label>
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
                  : <>Vence <strong>{fechaVencDisplay}</strong></>
                }
              </span>
            </div>
          </div>
        </div>

        <div className="col-12">
          <label className="form-label fw-semibold">Monto (CLP) <span className="text-danger">*</span></label>
          <input type="number" className="form-control" min="1" placeholder="0"
            value={form.monto} onChange={(e) => set('monto', e.target.value)} />
        </div>

        <div className="col-12">
          <label className="form-label fw-semibold">Observaciones</label>
          <textarea className="form-control" rows={2} placeholder="Opcional..."
            value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
