/**
 * WebSocket service for real-time updates.
 */

import logger from './logger';

type MessageHandler = (data: unknown) => void;

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

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
      logger.wsEvent('connected', { url: this.url });
      this.reconnectAttempts = 0;
      this.emit('connection_established', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message', error as Error, { url: this.url });
      }
    };

    this.ws.onclose = (event) => {
      logger.wsEvent('disconnected', { url: this.url, code: event.code, reason: event.reason });
      this.emit('connection_closed', { code: event.code, reason: event.reason });
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      logger.error('WebSocket error', null, { url: this.url, error: String(error) });
      this.emit('connection_error', { error });
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('Max reconnect attempts reached', { url: this.url });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.wsEvent('reconnecting', { url: this.url, delay, attempt: this.reconnectAttempts });

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
    } else {
      logger.warn('WebSocket is not connected, cannot send message', { url: this.url, type: data.type });
    }
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
      } catch (error) {
        logger.error(`Error in handler for event ${event}`, error as Error, { url: this.url });
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

// Helper to get WebSocket URL
export const getWebSocketUrl = (path: string): string => {
  // Get WebSocket host from env or derive from API URL
  let wsHost = import.meta.env.VITE_WS_HOST;
  
  if (!wsHost) {
    // Try to derive from API URL
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        wsHost = url.host;
      } catch {
        wsHost = window.location.host;
      }
    } else {
      wsHost = window.location.host;
    }
  }
  
  // Determine protocol based on host
  const isSecure = wsHost.includes('railway.app') || 
                   wsHost.includes('vercel.app') || 
                   window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';
  
  return `${protocol}//${wsHost}${path}`;
};

// Initialize WebSocket connections
export const initializeWebSockets = (token: string): void => {
  notificationWS.connect(getWebSocketUrl('/ws/notifications/'), token);
  dashboardWS.connect(getWebSocketUrl('/ws/dashboard/'), token);
};

// Disconnect all WebSocket connections
export const disconnectWebSockets = (): void => {
  notificationWS.disconnect();
  chatWS.disconnect();
  dashboardWS.disconnect();
};

export default WebSocketService;
