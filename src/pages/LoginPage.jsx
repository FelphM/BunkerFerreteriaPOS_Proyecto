/**
 * LoginPage.jsx
 * ---------------------------------------------------------------------------
 * Pantalla de inicio de sesión de Ferromat S.A.
 *
 * - Formulario de correo + contraseña.
 * - Llama a `signIn` del AuthContext (Supabase Auth).
 * - Muestra estado de carga, errores y éxito.
 * - Redirige al POS ("/") tras el login exitoso.
 *   (La redirección la maneja <ProtectedRoute> en App.jsx via `from`.)
 * - Diseño visual cohesivo con el sistema: usa la paleta naranja de Ferromat.
 * ---------------------------------------------------------------------------
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Turnstile from '../components/Turnstile';

// Si no hay clave configurada, el captcha simplemente no se muestra ni se
// exige — permite seguir desarrollando/desplegando sin bloquear el login
// mientras se configura Cloudflare Turnstile + Supabase (ver README/instrucciones).
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function LoginPage() {
  const { signIn, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Si el usuario llegó aquí desde una ruta protegida, volvemos a ella tras el login.
  const from = location.state?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  // Cambiar esta key fuerza un remount del widget (= pedir un token nuevo).
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    // Siempre prevenimos el submit nativo, incluso si la validación local falla.
    e.preventDefault();
    // Leemos los valores directamente del DOM como fallback (por si el
    // onChange de React no se disparó, ej: autocompletado del navegador).
    const emailVal = form.email || e.target.email?.value || '';
    const passVal = form.password || e.target.password?.value || '';
    if (!emailVal || !passVal) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) return;

    setLoading(true);
    const result = await signIn(emailVal, passVal, captchaToken);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else if (TURNSTILE_SITE_KEY) {
      // Los tokens de Turnstile son de un solo uso: pedimos uno nuevo.
      setCaptchaToken('');
      setCaptchaKey((k) => k + 1);
    }
  };

  return (
    <div className="fp-login-bg d-flex align-items-center justify-content-center vh-100">
      <div className="fp-login-card">
        {/* ----------------------- CABECERA ----------------------------- */}
        <div className="fp-login-header text-center mb-4">
          <div className="fp-login-logo mx-auto mb-3">
            <i className="bi bi-wrench-adjustable-circle" />
          </div>
          <h1 className="h3 fw-bold mb-0">Bunker Ferretería</h1>
          <p className="text-secondary mt-1 mb-0">Sistema de Punto de Venta</p>
        </div>

        {/* ----------------------- FORMULARIO --------------------------- */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Correo electrónico */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">
              Correo electrónico
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-envelope" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="tu@correo.cl"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-semibold">
              Contraseña
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-lock" />
              </span>
              <input
                id="password"
                name="password"
                type={verPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              {/* Toggle mostrar / ocultar contraseña */}
              <button
                type="button"
                className="input-group-text bg-white"
                onClick={() => setVerPassword((v) => !v)}
                tabIndex={-1}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <i className={`bi ${verPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          {/* Captcha (Cloudflare Turnstile) — solo si está configurado */}
          {TURNSTILE_SITE_KEY && (
            <div className="mb-3 d-flex justify-content-center">
              <Turnstile
                key={captchaKey}
                sitekey={TURNSTILE_SITE_KEY}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
              />
            </div>
          )}

          {/* Mensaje de error de autenticación */}
          {authError && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{authError}</span>
            </div>
          )}

          {/* Botón de ingreso */}
          <button
            type="submit"
            className="btn fp-btn-login w-100 py-3 fw-bold mt-2"
            disabled={loading || !form.email || !form.password || (TURNSTILE_SITE_KEY && !captchaToken)}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Ingresando...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                Ingresar al sistema
              </>
            )}
          </button>
        </form>

        {/* -------------------- PIE DE PÁGINA --------------------------- */}
        <p className="text-center text-secondary mt-4 mb-0 small">
          Si olvidaste tu contraseña, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}
