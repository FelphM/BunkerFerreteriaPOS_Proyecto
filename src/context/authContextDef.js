/**
 * authContextDef.js
 * ---------------------------------------------------------------------------
 * Definición del objeto Context de autenticación.
 * Separado de AuthContext.jsx para cumplir la regla
 * react-refresh/only-export-components (un archivo por tipo de export).
 * ---------------------------------------------------------------------------
 */
import { createContext } from 'react';

export const AuthContext = createContext(null);
