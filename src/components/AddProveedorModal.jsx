/**
 * AddProveedorModal.jsx
 * ---------------------------------------------------------------------------
 * Formulario para registrar un nuevo proveedor en Supabase.
 * Campos: nombre (requerido), telefono, correo, direccion, observaciones.
 * ---------------------------------------------------------------------------
 */
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './ui/Modal';

const VACIO = {
  nombre: '',
  telefono: '',
  correo: '',
  direccion: '',
  observaciones: '',
};

export default function AddProveedorModal({ show, onClose, onProveedorCreado }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGlobal(null);
  }

  function validar() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      e.correo = 'El correo no tiene un formato valido.';
    }
    return e;
  }

  async function handleGuardar() {
    const e = validar();
    if (Object.keys(e).length) { setErrores(e); return; }

    setGuardando(true);
    setErrorGlobal(null);
    try {
      const { data, error } = await supabase.from('proveedores').insert({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
        observaciones: form.observaciones.trim() || null,
      }).select().single();
      if (error) throw new Error(error.message);
      onProveedorCreado?.(data);
      handleClose();
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function handleClose() {
    setForm(VACIO);
    setErrores({});
    setErrorGlobal(null);
    onClose();
  }

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={guardando}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn fp-btn-accent"
        onClick={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
        ) : (
          <><i className="bi bi-check-lg me-1" />Guardar proveedor</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      show={show}
      onClose={handleClose}
      titulo="Nuevo proveedor"
      icono="bi-truck"
      size="lg"
      level={2}
      footer={footer}
    >
      {errorGlobal && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {errorGlobal}
        </div>
      )}

      <div className="row g-3">
        {/* Nombre */}
        <div className="col-12">
          <label className="form-label fw-semibold">
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
            placeholder="Ferreteria Mayorista S.A."
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            autoFocus
          />
          {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
        </div>

        {/* Telefono + Correo */}
        <div className="col-sm-6">
          <label className="form-label fw-semibold">Telefono</label>
          <input
            type="text"
            className="form-control"
            placeholder="+56 9 1234 5678"
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
          />
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-semibold">Correo</label>
          <input
            type="email"
            className={`form-control ${errores.correo ? 'is-invalid' : ''}`}
            placeholder="contacto@proveedor.cl"
            value={form.correo}
            onChange={(e) => set('correo', e.target.value)}
          />
          {errores.correo && <div className="invalid-feedback">{errores.correo}</div>}
        </div>

        {/* Direccion */}
        <div className="col-12">
          <label className="form-label fw-semibold">Direccion</label>
          <input
            type="text"
            className="form-control"
            placeholder="Av. Ejemplo 123, Santiago"
            value={form.direccion}
            onChange={(e) => set('direccion', e.target.value)}
          />
        </div>

        {/* Observaciones */}
        <div className="col-12">
          <label className="form-label fw-semibold">Observaciones</label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Notas adicionales sobre el proveedor..."
            value={form.observaciones}
            onChange={(e) => set('observaciones', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
