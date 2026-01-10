/**
 * WebSocket service for real-time updates.
 */

type MessageHandler = (data: unknown) => void;

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// Only log in development mode
const isDev = import.meta.env.DEV;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private token: string | null = null;
  private url: string = '';

  connect(url: string, token: string): void {
    this.url = url;
    this.token = token;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.url || !this.token) return;

    const wsUrl = `${this.url}?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('WebSocket connected');
      }
      this.reconnectAttempts = 0;
      this.emit('connection_established', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch {
        // Silently ignore parse errors in production
        this.emit('parse_error', { raw: event.data });
      }
    };

    this.ws.onclose = (event) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('WebSocket disconnected:', event.code, event.reason);
      }
      this.emit('connection_closed', { code: event.code, reason: event.reason });
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.emit('connection_error', { message: 'WebSocket connection error' });
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_reached', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  send(data: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
    // Silently ignore if not connected - the message will be lost
  }

  subscribe(channel: string): void {
    this.send({ type: 'subscribe', channel });
  }

  unsubscribe(channel: string): void {
    this.send({ type: 'unsubscribe', channel });
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: MessageHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch {
        // Silently ignore handler errors in production
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Notification WebSocket
export const notificationWS = new WebSocketService();

// Chat WebSocket
export const chatWS = new WebSocketService();

// Dashboard WebSocket
export const dashboardWS = new WebSocketService();

// Payments WebSocket
export const paymentsWS = new WebSocketService();

// Orders WebSocket
export const ordersWS = new WebSocketService();

// Helper to get WebSocket URL
export const getWebSocketUrl = (path: string): string => {
  // Use VITE_WS_URL if set, otherwise derive from API URL or window location
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (wsUrl) {
    // VITE_WS_URL should be like ws://localhost:8000/ws or wss://example.com/ws
    return `${wsUrl}${path}`;
  }
  
  // Fallback: derive from API URL or window location
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws${path}`;
  }
  
  // Last resort: use window location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws${path}`;
};

// Initialize WebSocket connections
export const initializeWebSockets = (token: string): void => {
  notificationWS.connect(getWebSocketUrl('/notifications/'), token);
  dashboardWS.connect(getWebSocketUrl('/dashboard/'), token);
  paymentsWS.connect(getWebSocketUrl('/payments/'), token);
  ordersWS.connect(getWebSocketUrl('/orders/'), token);
};

// Disconnect all WebSocket connections
export const disconnectWebSockets = (): void => {
  notificationWS.disconnect();
  chatWS.disconnect();
  dashboardWS.disconnect();
  paymentsWS.disconnect();
  ordersWS.disconnect();
};

export default WebSocketService;
