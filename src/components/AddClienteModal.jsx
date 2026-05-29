/**
 * AddClienteModal.jsx
 * ---------------------------------------------------------------------------
 * Formulario para registrar un nuevo cliente en la tabla `clientes` de Supabase.
 * Campos: nombre (requerido), rut (único), giro, telefono, correo, direccion.
 * ---------------------------------------------------------------------------
 */
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './ui/Modal';

const VACIO = {
  nombre: '',
  rut: '',
  giro: '',
  correo: '',
  telefono: '',
  direccion: '',
};

export default function AddClienteModal({ show, onClose, onClienteCreado }) {
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
      const { error } = await supabase.from('clientes').insert({
        nombre: form.nombre.trim(),
        rut: form.rut.trim() || null,
        giro: form.giro.trim() || null,
        correo: form.correo.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
      });
      if (error) throw new Error(error.message);
      onClienteCreado?.();
      handleClose();
    } catch (err) {
      // RUT duplicado es el error mas comun
      if (err.message.includes('clientes_rut_key') || err.message.includes('unique')) {
        setErrores({ rut: 'Este RUT ya esta registrado.' });
      } else {
        setErrorGlobal(err.message);
      }
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
          <><i className="bi bi-check-lg me-1" />Guardar cliente</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      show={show}
      onClose={handleClose}
      titulo="Nuevo cliente"
      icono="bi-person-plus"
      size="lg"
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
            placeholder="Juan Perez"
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            autoFocus
          />
          {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
        </div>

        {/* RUT + Giro */}
        <div className="col-sm-6">
          <label className="form-label fw-semibold">RUT</label>
          <input
            type="text"
            className={`form-control ${errores.rut ? 'is-invalid' : ''}`}
            placeholder="12.345.678-9"
            value={form.rut}
            onChange={(e) => set('rut', e.target.value)}
          />
          {errores.rut && <div className="invalid-feedback">{errores.rut}</div>}
        </div>
        <div className="col-sm-6">
          <label className="form-label fw-semibold">Giro</label>
          <input
            type="text"
            className="form-control"
            placeholder="Construccion, Mineria, etc."
            value={form.giro}
            onChange={(e) => set('giro', e.target.value)}
          />
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
            placeholder="juan@correo.cl"
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
            placeholder="Calle Ejemplo 456, Santiago"
            value={form.direccion}
            onChange={(e) => set('direccion', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
