/**
 * useBarcodeScanner.js
 * ---------------------------------------------------------------------------
 * Custom Hook que simula la lectura de una pistola de código de barras USB.
 *
 * Una pistola USB se comporta como un teclado: "teclea" los dígitos del código
 * muy rápido (milisegundos entre pulsación) y termina con un Enter.
 * Una persona escribe mucho más lento.
 *
 * Estrategia:
 *  - Escuchamos `keydown` a nivel de window (funciona aunque el foco no esté
 *    en el buscador, tal como ocurre con una pistola real).
 *  - Acumulamos caracteres en un buffer.
 *  - Si entre dos teclas pasa más de `timeoutMs`, asumimos tipeo humano y
 *    reiniciamos el buffer.
 *  - Al recibir Enter, si el buffer supera `minLength`, disparamos `onScan`.
 *
 * @param {(code: string) => void} onScan  Callback con el código capturado.
 * @param {object}  [options]
 * @param {number}  [options.minLength=3]  Largo mínimo para considerar válido.
 * @param {number}  [options.timeoutMs=80] Ms máximos entre teclas de un escáner.
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

      // Si pasó demasiado tiempo desde la última tecla -> tipeo humano.
      // Reiniciamos el buffer para no mezclar lecturas.
      if (now - lastKeyTimeRef.current > timeoutMs) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      // El escáner cierra la lectura con Enter.
      if (event.key === 'Enter') {
        const code = bufferRef.current;
        bufferRef.current = '';
        if (code.length >= minLength) {
          onScanRef.current(code);
        }
        return;
      }

      // Solo nos interesan caracteres imprimibles (dígitos/letras del código).
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, minLength, timeoutMs]);
}
