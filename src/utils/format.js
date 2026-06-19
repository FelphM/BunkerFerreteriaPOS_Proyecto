/**
 * format.js
 * ---------------------------------------------------------------------------
 * Utilidades de formato y reglas de presentacion compartidas por el POS.
 * ---------------------------------------------------------------------------
 */

/**
 * Formatea un numero como peso chileno (CLP), sin decimales.
 * Ej: 8990 -> "$8.990"
 * @param {number} value
 * @returns {string}
 */
export const formatCLP = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

/**
 * Normaliza una cantidad a numero seguro (>= 0).
 * Acepta decimales (productos vendidos por metro/kilo).
 * @param {number|string} value
 * @returns {number}
 */
export const safeQty = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Fecha larga en espanol para la barra superior, con la primera letra
 * en mayuscula. Ej: "Miercoles, 20 de mayo de 2026"
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export const formatLongDate = (date = new Date()) => {
  const texto = date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * Fecha corta. Ej: "20-05-2026"
 * @param {string|Date} value Fecha o ISO string.
 */
export const formatFecha = (value) =>
  new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

/**
 * Fecha y hora corta. Ej: "20-05-2026 14:30"
 * @param {string|Date} value
 */
export const formatFechaHora = (value) => {
  const d = new Date(value);
  return `${formatFecha(d)} ${d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

/** True si la fecha indicada cae en el dia de hoy. */
export const esHoy = (value) => {
  const d = new Date(value);
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
};

/** True si la fecha indicada cae en el mes calendario actual. */
export const esMesActual = (value) => {
  const d = new Date(value);
  const hoy = new Date();
  return (
    d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
  );
};

/**
 * Formatea un valor de stock eliminando ruido decimal.
 * Redondea a 2 decimales y quita ceros de relleno.
 * Ej: 499.9999 → "500", 9.67 → "9.67", 29.001 → "29"
 * @param {number|null|undefined} value
 * @returns {string}
 */
export const formatStock = (value) => {
  const n = parseFloat(Number(value ?? 0).toFixed(2));
  return n % 1 === 0 ? String(Math.round(n)) : String(n);
};

/**
 * Traduce el stock a un "estado" visual reutilizable.
 * El umbral de stock bajo podria venir de `configuracion` en produccion.
 * @param {number} stock
 * @param {number} [umbralBajo=10]
 * @returns {{ texto: string, variante: string, agotado: boolean }}
 *   variante = clase de color Bootstrap (success | warning | danger).
 */
export const getStockStatus = (stock, umbralBajo = 10) => {
  if (stock <= 0) {
    return { texto: 'Agotado', variante: 'danger', agotado: true };
  }
  if (stock <= umbralBajo) {
    return { texto: `Stock: ${formatStock(stock)}`, variante: 'warning', agotado: false };
  }
  return { texto: `Stock: ${formatStock(stock)}`, variante: 'success', agotado: false };
};
