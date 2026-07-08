/**
 * rut.js
 * ---------------------------------------------------------------------------
 * Utilidades para formatear y validar RUT chileno (persona o empresa).
 * ---------------------------------------------------------------------------
 */

/** Deja solo digitos y la K del dv, en mayuscula. Ej: "12.345.678-k" -> "12345678K" */
export const limpiarRut = (value) => (value || '').replace(/[^0-9kK]/g, '').toUpperCase();

/**
 * Calcula el digito verificador (modulo 11) para un cuerpo numerico de RUT.
 * @param {string} cuerpo Solo digitos, sin el dv.
 * @returns {string} '0'-'9' o 'K'.
 */
export const calcularDvRut = (cuerpo) => {
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
};

/**
 * Formatea un RUT chileno mientras el usuario escribe: "123456789" -> "12.345.678-9".
 * Trunca a 8 digitos de cuerpo + dv para evitar RUTs invalidos por longitud.
 * @param {string} value
 * @returns {string}
 */
export const formatearRut = (value) => {
  const limpio = limpiarRut(value).slice(0, 9);
  if (!limpio) return '';
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!cuerpo) return dv;
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
};

/**
 * Valida que un RUT chileno (formateado o no) tenga un digito verificador correcto.
 * @param {string} value
 * @returns {boolean}
 */
export const validarRut = (value) => {
  const limpio = limpiarRut(value);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return calcularDvRut(cuerpo) === dv;
};
