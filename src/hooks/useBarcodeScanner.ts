import { useEffect, useRef } from 'react';

/**
 * Captura leituras de leitor de código de barras USB (modo HID/teclado).
 *
 * O leitor "digita" o código em rajada (<80ms entre teclas) e termina com
 * Enter — digitação humana nunca é tão rápida, então o buffer zera em pausas
 * longas e campos de texto continuam funcionando normalmente.
 */
export interface BarcodeScannerOptions {
  /** Tamanho mínimo do código para disparar (default 4). */
  minLength?: number;
  /** Pausa (ms) que zera o buffer — acima disso é digitação humana. */
  maxKeyGapMs?: number;
  /** Desabilita a captura (ex.: modal aberto). */
  disabled?: boolean;
}

export function useBarcodeScanner(
  onScan: (code: string) => void,
  { minLength = 4, maxKeyGapMs = 80, disabled = false }: BarcodeScannerOptions = {},
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (disabled) return undefined;

    let buffer = '';
    let lastKey = 0;

    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKey > maxKeyGapMs) buffer = '';
      lastKey = now;

      if (e.key === 'Enter') {
        if (buffer.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(buffer);
        }
        buffer = '';
        return;
      }
      if (e.key.length === 1 && /[\w-]/.test(e.key)) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [minLength, maxKeyGapMs, disabled]);
}

export default useBarcodeScanner;
