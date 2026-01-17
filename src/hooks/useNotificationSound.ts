/**
 * Hook for playing notification sounds
 * Uses Web Audio API for reliable playback
 * 
 * Features:
 * - Multiple sound types (notification, order, success, error)
 * - Persistent alert sound for new orders (rings until acknowledged)
 * - Browser notification support
 * - Volume control
 */
import { useCallback, useRef, useEffect, useState } from 'react';

// Notification sound frequencies (pleasant chime)
const NOTIFICATION_FREQUENCIES = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
const ORDER_FREQUENCIES = [659.25, 783.99, 987.77, 1174.66]; // E5, G5, B5, D6 (ascending)
const URGENT_FREQUENCIES = [880, 698.46, 880, 698.46]; // A5, F5 alternating (urgent alert)

interface UseNotificationSoundOptions {
  enabled?: boolean;
  volume?: number;
  persistentAlerts?: boolean; // Keep ringing until acknowledged
}

export const useNotificationSound = (options: UseNotificationSoundOptions = {}) => {
  const { enabled = true, volume = 0.5, persistentAlerts = true } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const persistentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isAlertActive, setIsAlertActive] = useState(false);

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
      // Cleanup persistent alert on unmount
      if (persistentIntervalRef.current) {
        clearInterval(persistentIntervalRef.current);
      }
    };
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, startTime: number, vol: number, waveType: OscillatorType = 'sine') => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = waveType;
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

    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    
    // Play chord (all notes together)
    NOTIFICATION_FREQUENCIES.forEach((freq, i) => {
      playTone(freq, 0.3, now + i * 0.05, volume * 0.3);
    });
  }, [enabled, volume, playTone, ensureAudioContext]);

  const playOrderSoundOnce = useCallback(() => {
    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    
    // Play ascending arpeggio for new orders (more attention-grabbing)
    ORDER_FREQUENCIES.forEach((freq, i) => {
      playTone(freq, 0.25, now + i * 0.1, volume * 0.5);
    });
    
    // Second wave slightly delayed
    ORDER_FREQUENCIES.forEach((freq, i) => {
      playTone(freq, 0.2, now + 0.6 + i * 0.08, volume * 0.4);
    });
  }, [volume, playTone, ensureAudioContext]);

  const playOrderSound = useCallback(() => {
    if (!enabled) return;

    // Play the sound immediately
    playOrderSoundOnce();
    
    // If persistent alerts are enabled, keep playing until acknowledged
    if (persistentAlerts && !isAlertActive) {
      setIsAlertActive(true);
      
      // Play sound every 3 seconds
      persistentIntervalRef.current = setInterval(() => {
        playOrderSoundOnce();
      }, 3000);
      
      // Auto-stop after 30 seconds to prevent infinite ringing
      setTimeout(() => {
        stopAlert();
      }, 30000);
    }
    
    // Also try to show browser notification
    showBrowserNotification('🍝 Novo Pedido!', 'Você tem um novo pedido para processar.');
  }, [enabled, persistentAlerts, isAlertActive, playOrderSoundOnce]);

  const stopAlert = useCallback(() => {
    if (persistentIntervalRef.current) {
      clearInterval(persistentIntervalRef.current);
      persistentIntervalRef.current = null;
    }
    setIsAlertActive(false);
  }, []);

  const playSuccessSound = useCallback(() => {
    if (!enabled) return;

    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    
    // Two-note success sound (ascending)
    playTone(523.25, 0.15, now, volume * 0.3); // C5
    playTone(783.99, 0.3, now + 0.15, volume * 0.35); // G5
  }, [enabled, volume, playTone, ensureAudioContext]);

  const playErrorSound = useCallback(() => {
    if (!enabled) return;

    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    
    // Low descending tone for errors
    playTone(349.23, 0.2, now, volume * 0.3, 'triangle'); // F4
    playTone(293.66, 0.3, now + 0.2, volume * 0.3, 'triangle'); // D4
  }, [enabled, volume, playTone, ensureAudioContext]);

  const playPaymentSound = useCallback(() => {
    if (!enabled) return;

    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    
    // Cash register / payment confirmed sound (happy ascending)
    const paymentFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    paymentFreqs.forEach((freq, i) => {
      playTone(freq, 0.2, now + i * 0.12, volume * 0.35);
    });
    
    // Celebratory second wave
    setTimeout(() => {
      const now2 = ctx.currentTime;
      playTone(1046.50, 0.4, now2, volume * 0.3); // C6 sustained
    }, 600);
    
    showBrowserNotification('💰 Pagamento Confirmado!', 'Um pagamento foi recebido.');
  }, [enabled, volume, playTone, ensureAudioContext]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // We'll request permission on first interaction
      const requestPermission = () => {
        Notification.requestPermission();
      };
      document.addEventListener('click', requestPermission, { once: true });
      return () => document.removeEventListener('click', requestPermission);
    }
  }, []);

  return {
    playNotificationSound,
    playOrderSound,
    playSuccessSound,
    playErrorSound,
    playPaymentSound,
    stopAlert,
    isAlertActive,
  };
};

// Helper function to show browser notifications
function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/pastita-logo.ico',
        badge: '/pastita-logo.ico',
        tag: 'pastita-order', // Prevents duplicate notifications
        requireInteraction: true, // Stays until user interacts
        silent: false,
      });
      
      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
      
      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Could not show notification:', e);
    }
  }
}

export default useNotificationSound;
