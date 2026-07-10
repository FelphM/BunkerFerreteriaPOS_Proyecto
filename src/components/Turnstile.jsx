/**
 * Turnstile.jsx
 * ---------------------------------------------------------------------------
 * Widget de Cloudflare Turnstile (CAPTCHA) para el login.
 *
 * Carga el script oficial una sola vez (compartido entre instancias) y
 * renderiza el widget de forma imperativa via `window.turnstile`, evitando
 * agregar una dependencia npm para algo tan chico.
 *
 * La verificación real del token ocurre del lado de Supabase Auth con la
 * clave SECRETA configurada en el Dashboard (Authentication > Attack
 * Protection > Captcha protection) — la clave de acá (VITE_TURNSTILE_SITE_KEY)
 * es pública, está pensada para exponerse en el frontend.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptPromise = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * @param {string} sitekey - Clave pública de Turnstile.
 * @param {(token: string) => void} onVerify - Se llama con el token al resolver el desafío.
 * @param {() => void} [onExpire] - Se llama si el token expira o falla la validación.
 */
export default function Turnstile({ sitekey, onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Refs para siempre invocar la versión más reciente de los callbacks sin
  // tener que destruir y re-renderizar el widget (que forzaría al usuario a
  // resolver el desafío de nuevo) cada vez que el padre se re-renderiza.
  // Se sincronizan en un effect (no durante el render) porque mutar un ref
  // en el cuerpo del componente rompe las garantías de React.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let cancelado = false;

    loadTurnstileScript().then(() => {
      if (cancelado || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        callback: (token) => onVerifyRef.current?.(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': () => onExpireRef.current?.(),
      });
    });

    return () => {
      cancelado = true;
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // Montamos el widget una sola vez; usar `key` en el padre fuerza un
    // remount (y por lo tanto un token nuevo) cuando hace falta.
  }, [sitekey]);

  return <div ref={containerRef} />;
}
