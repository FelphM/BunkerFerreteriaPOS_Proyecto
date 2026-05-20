/**
 * useBarcodeScanner.js
 * ---------------------------------------------------------------------------
 * Custom Hook que simula la lectura de una pistola de codigo de barras USB.
 *
 * Una pistola USB se comporta como un teclado: "teclea" los digitos del codigo
 * muy rapido (milisegundos entre pulsacion) y termina con un Enter.
 * Una persona escribe mucho mas lento.
 *
 * Estrategia:
 *  - Escuchamos `keydown` a nivel de window (funciona aunque el foco no este
 *    en el buscador, tal como ocurre con una pistola real).
 *  - Acumulamos caracteres en un buffer.
 *  - Si entre dos teclas pasa mas de `timeoutMs`, asumimos tipeo humano y
 *    reiniciamos el buffer.
 *  - Al recibir Enter, si el buffer supera `minLength`, disparamos `onScan`.
 *
 * @param {(code: string) => void} onScan  Callback con el codigo capturado.
 * @param {object}  [options]
 * @param {number}  [options.minLength=3]  Largo minimo para considerar valido.
 * @param {number}  [options.timeoutMs=80] Ms maximos entre teclas de un escaner.
 * @param {boolean} [options.enabled=true] Permite desactivar el listener.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan, options = {}) {
  const { minLength = 3, timeoutMs = 80, enabled = true } = options;

  // Refs: evitan re-suscribir el listener en cada render y mantienen
  // el estado del buffer entre pulsaciones sin causar renders.
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  // Mantenemos la referencia al callback siempre actualizada.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const now = Date.now();

      // Si paso demasiado tiempo desde la ultima tecla -> tipeo humano.
      // Reiniciamos el buffer para no mezclar lecturas.
      if (now - lastKeyTimeRef.current > timeoutMs) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      // El escaner cierra la lectura con Enter.
      if (event.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code.length >= minLength) {
          onScanRef.current(code);
        }
        return;
      }

      // Solo nos interesan caracteres imprimibles (digitos/letras del codigo).
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, minLength, timeoutMs]);
}
