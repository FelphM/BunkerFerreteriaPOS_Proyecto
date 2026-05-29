/**
 * useAuth.js
 * ---------------------------------------------------------------------------
 * Hook de consumo del AuthContext. Archivo separado para cumplir la regla
 * react-refresh/only-export-components (solo puede haber componentes en un
 * archivo que exporte componentes React).
 *
 * Importar siempre desde aqui, no desde AuthContext.jsx directamente.
 *
 * @example
 * import { useAuth } from '../context/useAuth';
 * const { usuario, signOut, isAuthenticated } = useAuth();
 * ---------------------------------------------------------------------------
 */
import { useContext } from 'react';
import { AuthContext } from './authContextDef';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
