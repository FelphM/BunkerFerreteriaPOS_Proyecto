/**
 * useQuery.js
 * ---------------------------------------------------------------------------
 * Mini-hook generico para llamadas async a `queries.js`.
 *
 * Devuelve: { data, loading, error, refetch }
 *
 * Uso:
 *   const { data: ventas, loading } = useQuery(getVentas);
 *   const { data: inv } = useQuery(() => getVariantesInventario());
 * ---------------------------------------------------------------------------
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * @param {() => Promise<any>} queryFn  Funcion async que devuelve los datos.
 * @param {any[]} [deps=[]]             Dependencias extra (como useEffect).
 */
export function useQuery(queryFn, deps = []) {
  // undefined (no null): permite que el destructuring `data: x = []` aplique
  // el valor por defecto correctamente. Con null, `x = []` no funciona.
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Guardamos la referencia a queryFn para no re-disparar si el padre crea
  // una nueva funcion en cada render.
  const queryRef = useRef(queryFn);
  useEffect(() => { queryRef.current = queryFn; });

  // No podemos pasar `deps` directamente a useCallback (eslint requiere array
  // literal). Usamos un segundo useEffect que observe deps y llame a ejecutar.
  const ejecutar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryRef.current();
      setData(result);
    } catch (err) {
      setError(err.message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []); // ejecutar es estable; las deps externas se manejan abajo.

  // Se re-ejecuta cuando cambian las deps pasadas por el caller.
  // `ejecutar` es estable (useCallback con []), por lo que incluirlo
  // no causa loops infinitos. La llamada se hace en un setTimeout(0) para
  // que React no la considere una actualizacion sincrona dentro del efecto.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => ejecutar(), 0);
    return () => clearTimeout(id);
  }, [...deps, ejecutar]); // deps es un array spread, eslint no lo analiza estaticamente

  return { data, loading, error, refetch: ejecutar };
}
