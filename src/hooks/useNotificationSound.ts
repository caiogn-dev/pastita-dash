/**
 * Hook for playing notification sounds
 * Uses Web Audio API
 */
import { useCallback, useRef, useEffect, useState } from 'react';

const ORDER_FREQS = [659.25, 783.99, 987.77, 1174.66];

interface Options {
  enabled?: boolean;
  volume?: number;
}

export const useNotificationSound = (opts: Options = {}) => {
  const { enabled = true, volume = 0.5 } = opts;
  const ctx = useRef<AudioContext | null>(null);
  const alertInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [isAlertActive, setIsAlertActive] = useState(false);

  useEffect(() => {
    const init = () => {
      if (!ctx.current) ctx.current = new AudioContext();
    };
    document.addEventListener('click', init, { once: true });
    return () => {
      document.removeEventListener('click', init);
      if (alertInterval.current) clearInterval(alertInterval.current);
    };
  }, []);

  const tone = useCallback((freq: number, dur: number, start: number, vol: number) => {
    if (!ctx.current) return;
    const osc = ctx.current.createOscillator();
    const gain = ctx.current.createGain();
    osc.connect(gain);
    gain.connect(ctx.current.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
    osc.start(start);
    osc.stop(start + dur);
  }, []);

  const playOnce = useCallback(() => {
    if (!ctx.current) ctx.current = new AudioContext();
    if (ctx.current.state === 'suspended') ctx.current.resume();
    const now = ctx.current.currentTime;
    ORDER_FREQS.forEach((f, i) => tone(f, 0.25, now + i * 0.1, volume * 0.5));
    ORDER_FREQS.forEach((f, i) => tone(f, 0.2, now + 0.6 + i * 0.08, volume * 0.4));
  }, [tone, volume]);

  const playOrderSound = useCallback(() => {
    if (!enabled) return;
    playOnce();
    if (!isAlertActive) {
      setIsAlertActive(true);
      alertInterval.current = setInterval(playOnce, 3000);
      setTimeout(() => stopAlert(), 30000);
    }
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍝 Novo Pedido!', { body: 'Novo pedido recebido' });
    }
  }, [enabled, playOnce, isAlertActive]);

  const stopAlert = useCallback(() => {
    if (alertInterval.current) clearInterval(alertInterval.current);
    setIsAlertActive(false);
  }, []);

  const playSuccessSound = useCallback(() => {
    if (!enabled || !ctx.current) return;
    if (ctx.current.state === 'suspended') ctx.current.resume();
    const now = ctx.current.currentTime;
    tone(523.25, 0.15, now, volume * 0.3);
    tone(783.99, 0.3, now + 0.15, volume * 0.35);
  }, [enabled, tone, volume]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      document.addEventListener('click', () => Notification.requestPermission(), { once: true });
    }
  }, []);

  const playNotificationSound = playOrderSound; // Alias for compatibility

  return { playOrderSound, playSuccessSound, playNotificationSound, stopAlert, isAlertActive };
};

export default useNotificationSound;
