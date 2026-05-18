/**
 * usePushNotifications
 *
 * Manages the full lifecycle of Web Push notifications:
 * 1. Checks browser support and current permission state
 * 2. Requests permission and creates a PushSubscription via the VAPID public key
 * 3. Registers the subscription with the backend
 * 4. Provides an unsubscribe helper
 */

import { useState, useEffect, useCallback } from 'react';
import { getVapidPublicKey, registerPushSubscription, unregisterPushSubscription } from '../services/notifications';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UsePushNotificationsReturn {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/** Convert a URL-safe base64 VAPID public key to a Uint8Array for the browser API. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const [permission, setPermission] = useState<PushPermission>(
    supported ? (Notification.permission as PushPermission) : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<PushSubscription | null>(null);

  // Sync subscription state with the browser on mount
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setCurrentSubscription(sub);
        setIsSubscribed(!!sub);
      });
    });
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') {
        setError('Permissão para notificações negada.');
        return;
      }

      // 2. Fetch VAPID public key from backend
      const { data } = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey).buffer as ArrayBuffer;

      // 3. Subscribe via the browser PushManager
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. Extract keys and register with backend
      const subJson = sub.toJSON();
      await registerPushSubscription({
        endpoint: sub.endpoint,
        p256dh_key: subJson.keys?.p256dh ?? '',
        auth_key: subJson.keys?.auth ?? '',
        user_agent: navigator.userAgent,
      });

      setCurrentSubscription(sub);
      setIsSubscribed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar notificações.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!currentSubscription) return;

    setIsLoading(true);
    setError(null);

    try {
      await unregisterPushSubscription(currentSubscription.endpoint);
      await currentSubscription.unsubscribe();
      setCurrentSubscription(null);
      setIsSubscribed(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao desativar notificações.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription]);

  return { permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
