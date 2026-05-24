import { useRef, useCallback } from 'react';

// Gera um beep curto via Web Audio API — sem dependência de arquivo de áudio externo
function playBeep(frequency = 880, duration = 0.15, volume = 0.4) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio não disponível — silencioso
  }
}

export function useOrderSound() {
  const prevCountRef = useRef<number | null>(null);

  const checkAndNotify = useCallback((currentCount: number) => {
    if (prevCountRef.current !== null && currentCount > prevCountRef.current) {
      // Novo pedido! Toca dois beeps
      playBeep(880, 0.12, 0.5);
      setTimeout(() => playBeep(1100, 0.12, 0.5), 160);
    }
    prevCountRef.current = currentCount;
  }, []);

  return { checkAndNotify };
}
