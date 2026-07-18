/**
 * WebSocket Client - Real-time order updates
 * 
 * Handles:
 * - Connection with auth token
 * - Auto-reconnect on disconnect
 * - Event subscription/unsubscription
 * - Heartbeat responses (pong)
 * - Error resilience
 */

import { v4 as uuid } from 'uuid';

export interface WebSocketConfig {
  url: string;
  token: string;
  storeSlug: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketEvent {
  type: string;
  [key: string]: any;
}

type EventHandler = (event: WebSocketEvent) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private subscribers: Map<string, Map<string, EventHandler>> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private reconnectAttempts = 0;
  // disconnect() intencional dispara o evento 'close' do socket de forma
  // assíncrona; sem esta flag o handler agendava reconexão e o client virava
  // zumbi eterno da loja antiga (troca de loja/unmount criava um novo client
  // enquanto o velho seguia reconectando pra sempre).
  private intentionallyClosed = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private subscriptionIds: Map<string, { type: string; id: string }> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.intentionallyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.url}/ws/stores/${this.config.storeSlug}/orders/`;
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => {
          this.reconnectAttempts = 0;
          // Send authentication message on open
          this.ws!.send(JSON.stringify({
            type: 'auth',
            token: this.config.token,
          }));
          this.emit('connected');
          resolve();
        });

        this.ws.addEventListener('message', (event) => {
          this.handleMessage(event.data);
        });

        this.ws.addEventListener('close', () => {
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.ws.addEventListener('error', (error) => {
          this.emit('error', new Error('WebSocket connection error'));
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(eventType: string, handler: EventHandler): string {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }

    const subId = uuid();
    this.subscribers.get(eventType)!.set(subId, handler);
    this.subscriptionIds.set(subId, { type: eventType, id: subId });

    return subId;
  }

  unsubscribe(subscriptionId: string): boolean {
    const sub = this.subscriptionIds.get(subscriptionId);
    if (!sub) return false;

    this.subscribers.get(sub.type)?.delete(subscriptionId);
    this.subscriptionIds.delete(subscriptionId);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: 'connected' | 'disconnected' | 'error', handler: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: 'connected' | 'disconnected' | 'error', ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  private handleMessage(data: string): void {
    try {
      const event: WebSocketEvent = JSON.parse(data);

      // Handle heartbeat
      if (event.type === 'ping') {
        this.sendPong(event.timestamp);
        return;
      }

      // Dispatch to subscribers
      const handlers = this.subscribers.get(event.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Error in ${event.type} handler:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private sendPong(timestamp: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'pong',
          timestamp,
        })
      );
    }
  }

  private attemptReconnect(): void {
    // Fechamento pedido pelo app (troca de loja, unmount): não reconectar.
    if (this.intentionallyClosed) {
      return;
    }

    // Nunca desiste: um deploy do backend derruba o WS por ~1min e o teto de
    // 5 tentativas deixava o painel morto até um F5. Backoff exponencial com
    // teto de 30s; reconnectAttempts zera no próximo 'open'.
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30_000,
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.attemptReconnect();
      }
    }, delay);
  }
}

// Singleton instance
let instance: WebSocketClient | null = null;

export function createWebSocket(config?: WebSocketConfig): WebSocketClient {
  if (!instance && config) {
    instance = new WebSocketClient(config);
  }
  return instance!;
}

export function clearWebSocketInstance(): void {
  instance?.disconnect();
  instance = null;
}
