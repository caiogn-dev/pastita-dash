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
  readonly config: Required<WebSocketConfig>;
  private subscribers: Map<string, Map<string, EventHandler>> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private reconnectAttempts = 0;
  // disconnect() intencional dispara o evento 'close' do socket de forma
  // assíncrona; sem esta flag o handler agendava reconexão e o client virava
  // zumbi eterno da loja antiga (troca de loja/unmount criava um novo client
  // enquanto o velho seguia reconectando pra sempre).
  private intentionallyClosed = false;
  // Uma falha de conexão produz DOIS sinais — o evento 'close' e a rejeição da
  // Promise de connect() — e ambos levavam a attemptReconnect(). Cada rodada de
  // falha virava 1 cadeia em 2: t=3s 2, t=6s 4, t=12s 8… Num deploy de ~90s do
  // backend o navegador chegava a >100 handshakes concorrentes contra o Daphne
  // exatamente enquanto ele subia. Esta flag torna o reagendamento idempotente.
  private reconnecting = false;
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
        const socket = new WebSocket(url);
        this.ws = socket;
        // Sockets órfãos (de cadeias antigas ou de uma tentativa já superada)
        // continuam emitindo eventos. Sem esta checagem, o 'close' de um socket
        // que nem é mais o atual reagendava reconexão e mexia no estado do
        // client vivo.
        const ehOAtual = () => this.ws === socket;

        socket.addEventListener('open', () => {
          if (!ehOAtual()) {
            socket.close();
            return;
          }
          this.reconnectAttempts = 0;
          // Send authentication message on open
          socket.send(JSON.stringify({
            type: 'auth',
            token: this.config.token,
          }));
          this.emit('connected');
          resolve();
        });

        socket.addEventListener('message', (event) => {
          if (!ehOAtual()) return;
          this.handleMessage(event.data);
        });

        socket.addEventListener('close', () => {
          if (!ehOAtual()) return;
          this.emit('disconnected');
          this.attemptReconnect();
        });

        socket.addEventListener('error', (error) => {
          if (!ehOAtual()) return;
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
    this.reconnecting = false;
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
    // `reconnecting` garante UMA cadeia só: 'close' e a rejeição da Promise
    // chegam os dois, e antes cada um abria a sua.
    if (this.intentionallyClosed || this.reconnecting) {
      return;
    }
    this.reconnecting = true;

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

    // Um slot só de timer, sempre limpo antes de reatribuir: antes N cadeias
    // escreviam no mesmo campo e só a última era cancelável, então disconnect()
    // deixava as outras vivas — e ao disparar elas chamavam connect(), que zera
    // `intentionallyClosed` e ressuscitava um client que o app tentou matar.
    // Nota: este clearTimeout e a flag `reconnecting` são REDUNDANTES entre si —
    // verificado por mutação, cada um sozinho já impede a duplicação, e só
    // removendo os dois o teste quebra. É defesa em profundidade de propósito;
    // não remova um "porque o teste continua passando".
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      this.reconnecting = false;
      if (this.intentionallyClosed) return;
      try {
        await this.connect();
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }
}

// Singleton instance
let instance: WebSocketClient | null = null;

/** Identidade do socket: mudou algum destes, o cliente antigo não serve mais. */
function mesmaConexao(a: WebSocketConfig, b: WebSocketConfig): boolean {
  return a.url === b.url && a.token === b.token && a.storeSlug === b.storeSlug;
}

export function createWebSocket(config?: WebSocketConfig): WebSocketClient {
  if (config && instance && !mesmaConexao(instance.config, config)) {
    // Trocou de loja ou o token foi renovado: devolver a instância antiga
    // entregava um socket apontando para OUTRA loja (ou já morto), e o pedido
    // novo nunca chegava — só depois de um F5. O inbox não sofria porque usa
    // outro hook, o que fazia o defeito parecer "só nos pedidos".
    instance.disconnect();
    instance = null;
  }
  if (!instance && config) {
    instance = new WebSocketClient(config);
  }
  return instance!;
}

export function clearWebSocketInstance(): void {
  instance?.disconnect();
  instance = null;
}
