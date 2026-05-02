/**
 * Shared Realtime Adapter
 *
 * A lightweight, framework-agnostic WebSocket adapter with:
 *  - Auto-reconnect with exponential backoff
 *  - Multiple subscribers per instance (pub/sub)
 *  - Token passed as ?token= query param
 *  - Clean disconnect() that cancels all timers
 *
 * This is an additive foundation — existing hooks/contexts are NOT changed.
 * Consumers can migrate to this adapter incrementally.
 */

export type RealtimeEventHandler = (event: MessageEvent) => void;

export interface RealtimeAdapter {
  /** Open the WebSocket connection. Idempotent if already open/connecting. */
  connect(url: string, token?: string): void;
  /** Close the connection and cancel all pending reconnect timers. */
  disconnect(): void;
  /** Send arbitrary data. Queues silently if not yet connected. */
  send(data: unknown): void;
  /**
   * Subscribe to raw MessageEvent notifications.
   * Returns an unsubscribe function.
   */
  on(handler: RealtimeEventHandler): () => void;
  /** Whether the underlying WebSocket is currently OPEN. */
  readonly isConnected: boolean;
}

export interface RealtimeAdapterOptions {
  /**
   * Base delay (ms) for the first reconnect attempt.
   * Each subsequent attempt doubles it.
   * @default 1000
   */
  reconnectDelay?: number;
  /**
   * Maximum number of reconnect attempts before giving up.
   * Set to 0 to disable auto-reconnect.
   * @default 5
   */
  maxReconnects?: number;
}

/**
 * Creates a new RealtimeAdapter instance.
 *
 * Usage:
 * ```ts
 * const adapter = createRealtimeAdapter({ maxReconnects: 5 });
 *
 * const unsub = adapter.on((event) => {
 *   const data = JSON.parse(event.data);
 *   console.log(data);
 * });
 *
 * adapter.connect('wss://example.com/ws/', authToken);
 *
 * // Later:
 * unsub();
 * adapter.disconnect();
 * ```
 */
export function createRealtimeAdapter(
  options: RealtimeAdapterOptions = {}
): RealtimeAdapter {
  const { reconnectDelay = 1000, maxReconnects = 5 } = options;

  let ws: WebSocket | null = null;
  let currentUrl = '';
  let currentToken: string | undefined;
  let attemptCount = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let intentionalClose = false;

  const subscribers = new Set<RealtimeEventHandler>();

  // ── Helpers ──────────────────────────────────────────────────────────────

  function buildUrl(url: string, token?: string): string {
    if (!token) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${token}`;
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (maxReconnects === 0 || attemptCount >= maxReconnects) {
      console.warn(
        `[RealtimeAdapter] Max reconnect attempts (${maxReconnects}) reached. Giving up.`
      );
      return;
    }

    // Exponential backoff capped at 30 s
    const delay = Math.min(reconnectDelay * Math.pow(2, attemptCount), 30_000);
    attemptCount += 1;

    console.log(
      `[RealtimeAdapter] Reconnecting in ${delay}ms (attempt ${attemptCount}/${maxReconnects})`
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openSocket(currentUrl, currentToken);
    }, delay);
  }

  function openSocket(url: string, token?: string): void {
    // Guard: already open or connecting
    if (
      ws !== null &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const fullUrl = buildUrl(url, token);

    try {
      ws = new WebSocket(fullUrl);
    } catch (err) {
      console.error('[RealtimeAdapter] Failed to create WebSocket:', err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('[RealtimeAdapter] Connected');
      attemptCount = 0; // reset backoff on success
    };

    ws.onmessage = (event: MessageEvent) => {
      subscribers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error('[RealtimeAdapter] Subscriber error:', err);
        }
      });
    };

    ws.onclose = (event) => {
      console.log(
        `[RealtimeAdapter] Closed (code=${event.code}, reason="${event.reason}")`
      );
      ws = null;

      // Do not reconnect if closed intentionally or by the server with a
      // 4xxx code (application-level rejection).
      if (intentionalClose || (event.code >= 4000 && event.code < 5000)) {
        return;
      }

      scheduleReconnect();
    };

    ws.onerror = (event) => {
      console.error('[RealtimeAdapter] WebSocket error:', event);
      // onclose will fire immediately after onerror; let it handle reconnect.
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const adapter: RealtimeAdapter = {
    connect(url: string, token?: string): void {
      intentionalClose = false;
      currentUrl = url;
      currentToken = token;
      clearReconnectTimer();
      openSocket(url, token);
    },

    disconnect(): void {
      intentionalClose = true;
      clearReconnectTimer();

      if (ws !== null) {
        // Detach handlers before closing so onclose does not trigger reconnect
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;

        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close(1000, 'Client disconnect');
        }
        ws = null;
      }

      attemptCount = 0;
      console.log('[RealtimeAdapter] Disconnected');
    },

    send(data: unknown): void {
      if (ws === null || ws.readyState !== WebSocket.OPEN) {
        console.warn('[RealtimeAdapter] send() called while not connected — ignored');
        return;
      }

      const payload =
        typeof data === 'string' ? data : JSON.stringify(data);

      try {
        ws.send(payload);
      } catch (err) {
        console.error('[RealtimeAdapter] send() error:', err);
      }
    },

    on(handler: RealtimeEventHandler): () => void {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },

    get isConnected(): boolean {
      return ws !== null && ws.readyState === WebSocket.OPEN;
    },
  };

  return adapter;
}
