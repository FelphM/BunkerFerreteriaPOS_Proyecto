import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Usamos una instancia aislada para no interferir con la sesión actual del administrador
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempSupabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export default function AddUserModal({ show, onClose, onUserCreated }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const primerInputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setForm({ nombre: '', email: '', password: '' });
      setError(null);
      setExito(false);
      setTimeout(() => primerInputRef.current?.focus(), 80);
    }
  }, [show]);

  useEffect(() => {
    if (!show) return undefined;
    const h = (e) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [show, onClose, guardando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const { data, error: signUpError } = await tempSupabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { nombre: form.nombre.trim() },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      setExito(true);
      if (onUserCreated) onUserCreated(data.user);
      setTimeout(() => {
        setExito(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al crear el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !guardando) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-person-plus me-2 text-accent" />
                Añadir Nuevo Usuario
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={guardando}
              />
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger py-2">
                    <i className="bi bi-exclamation-circle-fill me-2" />
                    {error}
                  </div>
                )}
                {exito && (
                  <div className="alert alert-success py-2">
                    <i className="bi bi-check-circle-fill me-2" />
                    Usuario creado. ¡El perfil se generó automáticamente!
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nombre Completo</label>
                  <input
                    ref={primerInputRef}
                    type="text"
                    name="nombre"
                    className="form-control"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="juan@ferromat.cl"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Contraseña Temporal</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <small className="text-secondary mt-1 d-block">
                    El usuario podrá acceder con estas credenciales.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn fp-btn-accent fw-bold px-4"
                  disabled={guardando || exito}
                >
                  {guardando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
