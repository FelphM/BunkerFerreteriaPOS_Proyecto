/**
 * EditClienteModal.jsx
 * ---------------------------------------------------------------------------
 * Formulario para editar un cliente existente en la tabla `clientes`.
 * Carga los datos completos desde Supabase al abrir.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './ui/Modal';

const VACIO = { nombre: '', rut: '', giro: '', correo: '', telefono: '', direccion: '' };

export default function EditClienteModal({ cliente, onClose, onClienteEditado }) {
  const show = !!cliente;
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGlobal(null);
  }

  useEffect(() => {
    if (!cliente) return;
    setErrores({});
    setErrorGlobal(null);
    supabase
      .from('clientes')
      .select('*')
      .eq('id', cliente.clave)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          nombre:    data.nombre    ?? '',
          rut:       data.rut       ?? '',
          giro:      data.giro      ?? '',
          correo:    data.correo    ?? '',
          telefono:  data.telefono  ?? '',
          direccion: data.direccion ?? '',
        });
      });
  }, [cliente]);

  function validar() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (
      form.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())
    ) {
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
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre:    form.nombre.trim(),
          rut:       form.rut.trim()       || null,
          giro:      form.giro.trim()      || null,
          correo:    form.correo.trim()    || null,
          telefono:  form.telefono.trim()  || null,
          direccion: form.direccion.trim() || null,
        })
        .eq('id', cliente.clave);

      if (error) throw new Error(error.message);
      onClienteEditado?.();
      handleClose();
    } catch (err) {
      if (err.message.includes('clientes_rut_key') || err.message.includes('unique')) {
        setErrores({ rut: 'Este RUT ya esta registrado en otro cliente.' });
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
          <><i className="bi bi-check-lg me-1" />Guardar cambios</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      show={show}
      onClose={handleClose}
      titulo="Editar cliente"
      icono="bi-person-gear"
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
