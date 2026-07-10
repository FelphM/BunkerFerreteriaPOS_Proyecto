/**
 * AuthContext.jsx
 * ---------------------------------------------------------------------------
 * Contexto global de autenticación del sistema Ferromat.
 *
 * Exporta:
 *   AuthContext  -> el contexto (para useContext en useAuth.js)
 *   AuthProvider -> componente que envuelve la app en main.jsx
 *
 * El hook `useAuth()` vive en `context/useAuth.js` (separado para cumplir
 * la regla react-refresh/only-export-components).
 *
 * ARQUITECTURA:
 *   - `onAuthStateChange` escucha TODOS los cambios de sesión (login, logout,
 *     refresh de token, expiración). Es el único lugar donde se actualiza el
 *     estado, lo que garantiza consistencia.
 *   - Al detectar un evento SIGNED_IN, consultamos `usuarios_perfiles` para
 *     obtener el nombre y rol del usuario vinculado a `auth.users`.
 *   - La sesión se guarda en localStorage (configurado en supabaseClient.js),
 *     por lo que sobrevive recargas de página.
 *
 * INTEGRACIÓN CON EL ESQUEMA SQL:
 *   - `usuarios_perfiles` se crea automáticamente vía el trigger
 *     `on_auth_user_created` al registrar un nuevo usuario en Supabase Auth.
 *     Incluye nombre (de raw_user_meta_data), rol ('cajero') y activo (true).
 *   - Cambiar rol o desactivar un usuario (solo administradores) se hace
 *     desde ConfiguracionPage.jsx vía UPDATE directo; requiere la policy RLS
 *     `usuarios_update_admin` documentada en el comentario de cabecera de ese archivo.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  // `loading = true` durante la carga inicial: evita el flash de login.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------------------
  // Carga el perfil desde `usuarios_perfiles` (con política RLS SELECT).
  // -------------------------------------------------------------------------
  const cargarPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null);
      return;
    }

    const { data, error: err } = await supabase
      .from('usuarios_perfiles')
      .select('id, nombre, rol, activo')
      .eq('id', userId)
      .single();

    if (err) {
      // El perfil puede no existir si el trigger no se ejecutó aún (race
      // condition en la primera conexión). No es un error fatal.
      console.warn('[AuthContext] Perfil no encontrado:', err.message);
      setPerfil(null);
    } else {
      setPerfil(data);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Listener de cambios de sesión.
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Usamos SOLO onAuthStateChange (no getSession separado) para evitar la
    // condición de carrera por el lock de auth de Supabase al recargar página.
    // INITIAL_SESSION se dispara al montar con la sesión existente en localStorage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        setSession(sess);

        if (event === 'INITIAL_SESSION') {
          // Restauración de sesión al cargar/recargar la página.
          await cargarPerfil(sess?.user?.id);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setError(null);
          await cargarPerfil(sess?.user?.id);
        } else if (event === 'SIGNED_OUT') {
          setPerfil(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [cargarPerfil]);

  // -------------------------------------------------------------------------
  // Acciones públicas
  // -------------------------------------------------------------------------

  /**
   * Inicia sesión con email y contraseña.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  const signIn = useCallback(async (email, password) => {
    setError(null);

    // Detecta configuración incompleta antes de llamar a Supabase.
    const url = import.meta.env.VITE_SUPABASE_URL ?? '';
    if (!url || url.includes('tu-proyecto')) {
      const msg =
        'Supabase no está configurado. Completa VITE_SUPABASE_URL y ' +
        'VITE_SUPABASE_ANON_KEY en el archivo .env.local y reinicia el servidor.';
      setError(msg);
      return { success: false, message: msg };
    }

    let res;
    try {
      res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    } catch {
      const msg = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      setError(msg);
      return { success: false, message: msg };
    }

    if (res.error) {
      const mensajes = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'Email not confirmed': 'Debes confirmar tu correo antes de ingresar.',
        'User not found': 'No existe una cuenta con ese correo.',
        'Too many requests': 'Demasiados intentos. Intenta en unos minutos.',
      };
      const msg =
        mensajes[res.error.message] ??
        `Error al iniciar sesión: ${res.error.message}`;
      setError(msg);
      return { success: false, message: msg };
    }

    return { success: true };
  }, []);

  /**
   * Cierra la sesión actual. El listener limpia `session` y `perfil`
   * automáticamente al recibir el evento SIGNED_OUT.
   */
  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
  }, []);

  // -------------------------------------------------------------------------
  // Valor del contexto
  // -------------------------------------------------------------------------
  const value = {
    session,
    perfil,
    loading,
    error,
    signIn,
    signOut,
    usuario: {
      email: session?.user?.email ?? '',
      nombre: perfil?.nombre ?? session?.user?.email?.split('@')[0] ?? 'Usuario',
      rol: perfil?.rol ?? 'cajero',
      activo: perfil?.activo ?? true,
    },
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
