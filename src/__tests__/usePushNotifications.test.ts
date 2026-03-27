/**
 * Unit tests for src/hooks/usePushNotifications.ts
 */

import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as notificationsService from '../services/notifications';

// ─── Browser API mocks ─────────────────────────────────────────────────────────

const mockGetSubscription = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

const mockPushManager = {
  getSubscription: mockGetSubscription,
  subscribe: mockSubscribe,
};

const mockRegistration = {
  pushManager: mockPushManager,
};

Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    serviceWorker: {
      ready: Promise.resolve(mockRegistration),
      register: jest.fn(),
    },
    userAgent: 'jest-test-agent',
  },
});

Object.defineProperty(global, 'Notification', {
  writable: true,
  value: {
    permission: 'default' as NotificationPermission,
    requestPermission: jest.fn(),
  },
});

Object.defineProperty(global.window, 'PushManager', {
  writable: true,
  value: class PushManager {},
});

// ─── Service mocks ─────────────────────────────────────────────────────────────

jest.mock('../services/notifications', () => ({
  getVapidPublicKey: jest.fn(),
  registerPushSubscription: jest.fn(),
  unregisterPushSubscription: jest.fn(),
}));

const mockGetVapidPublicKey = notificationsService.getVapidPublicKey as jest.Mock;
const mockRegisterPushSubscription = notificationsService.registerPushSubscription as jest.Mock;
const mockUnregisterPushSubscription = notificationsService.unregisterPushSubscription as jest.Mock;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeSubscription(endpoint = 'https://push.example.com/sub/1') {
  return {
    endpoint,
    toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    unsubscribe: mockUnsubscribe,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no existing subscription
  mockGetSubscription.mockResolvedValue(null);
  (Notification as any).permission = 'default';
});

describe('usePushNotifications', () => {
  it('returns permission=default and isSubscribed=false initially', async () => {
    const { result } = renderHook(() => usePushNotifications());

    // Wait for the useEffect to resolve the subscription check
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.permission).toBe('default');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('detects an existing subscription on mount', async () => {
    const sub = makeSubscription();
    mockGetSubscription.mockResolvedValue(sub);

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // flush all promises
    });

    expect(result.current.isSubscribed).toBe(true);
  });

  it('subscribe() requests permission, subscribes, and registers with backend', async () => {
    (Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
    mockGetVapidPublicKey.mockResolvedValue({ data: { publicKey: 'dGVzdC1rZXk' } }); // base64 'test-key'
    const sub = makeSubscription();
    mockSubscribe.mockResolvedValue(sub);
    mockRegisterPushSubscription.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(Notification.requestPermission).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
    expect(mockRegisterPushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: sub.endpoint,
        p256dh_key: 'p256dh-key',
        auth_key: 'auth-key',
      })
    );
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.permission).toBe('granted');
  });

  it('subscribe() sets error when permission is denied', async () => {
    (Notification.requestPermission as jest.Mock).mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.error).toMatch(/negada/i);
    expect(mockRegisterPushSubscription).not.toHaveBeenCalled();
  });

  it('unsubscribe() deactivates and calls backend', async () => {
    // Start with an existing subscription
    const sub = makeSubscription();
    mockGetSubscription.mockResolvedValue(sub);
    mockUnsubscribe.mockResolvedValue(true);
    mockUnregisterPushSubscription.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isSubscribed).toBe(true);

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockUnregisterPushSubscription).toHaveBeenCalledWith(sub.endpoint);
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  it('subscribe() captures unexpected errors', async () => {
    (Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
    mockGetVapidPublicKey.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });
});
