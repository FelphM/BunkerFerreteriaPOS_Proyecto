/**
 * supabaseClient.js
 * ---------------------------------------------------------------------------
 * Instancia SINGLETON del cliente de Supabase.
 *
 * Todo el sistema importa este archivo para acceder a la API de Supabase:
 * autenticacion, queries a tablas, RPC, realtime, etc.
 *
 * Las credenciales se leen desde las variables de entorno de Vite (.env.local).
 * Nunca deben estar hardcodeadas en el codigo fuente.
 *
 * CONFIGURACION (ver .env.local):
 *   VITE_SUPABASE_URL      -> Project URL (Settings -> API)
 *   VITE_SUPABASE_ANON_KEY -> anon public key (Settings -> API)
 * ---------------------------------------------------------------------------
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Advertencia en desarrollo si faltan las variables (facilita el onboarding).
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Ferromat] Faltan variables de entorno de Supabase.\n' +
    'Crea el archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    'Ver .env.local para instrucciones.',
  );
}

/**
 * Cliente de Supabase.
 * Gestiona la sesion del usuario en localStorage automaticamente.
 * Usar `supabase.auth`, `supabase.from()`, `supabase.rpc()`, etc.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // Guarda la sesion en localStorage para que sobreviva recargas de pagina.
    persistSession: true,
    // Refresca el token automaticamente antes de que expire.
    autoRefreshToken: true,
    // Detecta el token en la URL (necesario para magic links y OAuth callbacks).
    detectSessionInUrl: true,
  },
});
