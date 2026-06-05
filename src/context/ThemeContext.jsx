/**
 * ThemeContext.jsx
 * ---------------------------------------------------------------------------
 * Contexto global para el tema claro / oscuro del sistema.
 * Persiste la preferencia en localStorage y aplica data-bs-theme en <html>
 * para activar el modo oscuro nativo de Bootstrap 5.3.
 * ---------------------------------------------------------------------------
 */
import { createContext, useContext, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('fp_theme') === 'dark');

  // useLayoutEffect: se ejecuta síncrono antes del paint para evitar parpadeo
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
    localStorage.setItem('fp_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme: () => setDark((v) => !v) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
