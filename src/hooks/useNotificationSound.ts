/**
 * Hook for playing notification sounds
 * Uses Web Audio API for reliable playback
 */
import { useCallback, useRef, useEffect } from 'react';

// Notification sound frequencies (pleasant chime)
const NOTIFICATION_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
const ORDER_FREQUENCIES = [659.25, 783.99, 987.77, 1174.66]; // E5, G5, B5, D6 (ascending)

interface UseNotificationSoundOptions {
  enabled?: boolean;
  volume?: number;
}

export const useNotificationSound = (options: UseNotificationSoundOptions = {}) => {
  const { enabled = true, volume = 0.5 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => document.addEventListener(event, initAudio, { once: true }));

    return () => {
      events.forEach(event => document.removeEventListener(event, initAudio));
    };
  }, []);

  const playTone = useCallback((frequency: number, duration: number, startTime: number, vol: number) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!enabled) return;

    // Initialize context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Play chord (all notes together)
    NOTIFICATION_FREQUENCIES.forEach((freq, i) => {
      playTone(freq, 0.3, now + i * 0.05, volume * 0.3);
    });
  }, [enabled, volume, playTone]);

  const playOrderSound = useCallback(() => {
    if (!enabled) return;

    // Initialize context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Play ascending arpeggio for new orders (more attention-grabbing)
    ORDER_FREQUENCIES.forEach((freq, i) => {
      playTone(freq, 0.25, now + i * 0.1, volume * 0.4);
    });
    
    // Repeat once for emphasis
    setTimeout(() => {
      const now2 = ctx.currentTime;
      ORDER_FREQUENCIES.forEach((freq, i) => {
        playTone(freq, 0.25, now2 + i * 0.1, volume * 0.3);
      });
    }, 600);
  }, [enabled, volume, playTone]);

  const playSuccessSound = useCallback(() => {
    if (!enabled) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Two-note success sound
    playTone(523.25, 0.15, now, volume * 0.3); // C5
    playTone(783.99, 0.3, now + 0.15, volume * 0.3); // G5
  }, [enabled, volume, playTone]);

  const playErrorSound = useCallback(() => {
    if (!enabled) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Low descending tone for errors
    playTone(349.23, 0.2, now, volume * 0.3); // F4
    playTone(293.66, 0.3, now + 0.2, volume * 0.3); // D4
  }, [enabled, volume, playTone]);

  return {
    playNotificationSound,
    playOrderSound,
    playSuccessSound,
    playErrorSound,
  };
};

export default useNotificationSound;
