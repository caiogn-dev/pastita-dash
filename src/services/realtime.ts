/**
 * Realtime Connection Service
 * Suporte a múltiplos transportes: WebSocket → SSE → HTTP Polling
 * Fallback automático com reconexão e backoff exponencial
 */

export type TransportType = 'websocket' | 'sse' | 'polling';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface EventCallback {
  (data: unknown): void;
}

interface ConnectionOptions {
  url: string;
  token?: string;
  storeSlug?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  pingInterval?: number;
  fallbackOrder?: TransportType[];
}

export interface TransportCapabilities {
  websocket: boolean;
  sse: boolean;
  polling: boolean;
}

interface PollingOrderSnapshot {
  id: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  updated_at?: string;
  created_at?: string;
  customer_name?: string;
  total?: number | string;
}

interface PaginatedPayload<T> {
  results?: T[];
}

function buildAuthHeader(token: string | null): Record<string, string> {
  if (!token) {
    return {};
  }

  return {
    Authorization: token.includes('.') ? `Bearer ${token}` : `Token ${token}`,
  };
}

/**
 * Detecta as capacidades do navegador para cada transporte
 */
export function detectTransportCapabilities(): TransportCapabilities {
  return {
    websocket: typeof window !== 'undefined' && 'WebSocket' in window,
    sse: typeof window !== 'undefined' && 'EventSource' in window,
    polling: true, // Sempre disponível
  };
}

/**
 * Verifica se um transporte específico é suportado
 */
export function isTransportSupported(transport: TransportType): boolean {
  const caps = detectTransportCapabilities();
  return caps[transport];
}

/**
 * Classe principal de conexão realtime com fallback automático
 */
export class RealtimeConnection {
  private transport: TransportType | null = null;
  private fallbackOrder: TransportType[] = ['websocket', 'sse', 'polling'];
  private currentFallbackIndex = 0;
  
  // Handlers de conexão
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private pollingInterval: number | null = null;
  private pollingController: AbortController | null = null;
  // Base polling cadence (orders não precisam de 5s; reduz carga e evita 429).
  private pollBaseMs = 15000;
  // Backoff extra acumulado quando o backend responde 429 (rate limit).
  private pollBackoffMs = 0;
  private pollMaxBackoffMs = 120000;
  
  // Estado
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private pingInterval = 25000;
  
  // Configuração
  private options: ConnectionOptions;
  private baseUrl: string;
  private token: string | null = null;
  private pollingBaselineReady = false;
  private pollingSnapshot = new Map<string, PollingOrderSnapshot>();
  
  // Event listeners
  private listeners = new Map<string, Set<EventCallback>>();
  private globalListeners = new Set<(event: string, data: unknown) => void>();
  
  // Status callbacks
  private statusCallbacks = new Set<(status: ConnectionStatus, transport: TransportType | null) => void>();
  private errorCallbacks = new Set<(error: Error, transport: TransportType | null) => void>();

  constructor(options: ConnectionOptions) {
    this.options = {
      reconnectAttempts: 10,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      pingInterval: 25000,
      fallbackOrder: ['websocket', 'sse', 'polling'],
      ...options,
    };
    
    this.baseUrl = options.url;
    this.token = options.token || null;
    this.maxReconnectAttempts = this.options.reconnectAttempts!;
    this.reconnectDelay = this.options.reconnectDelay!;
    this.maxReconnectDelay = this.options.maxReconnectDelay!;
    this.pingInterval = this.options.pingInterval!;
    this.fallbackOrder = this.options.fallbackOrder!;
  }

  /**
   * Retorna o transporte atual
   */
  getTransport(): TransportType | null {
    return this.transport;
  }

  /**
   * Retorna o status atual da conexão
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Retorna informações sobre a conexão atual
   */
  getConnectionInfo() {
    return {
      transport: this.transport,
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      currentFallbackIndex: this.currentFallbackIndex,
      storeSlug: this.options.storeSlug || null,
      capabilities: detectTransportCapabilities(),
    };
  }

  /**
   * Inicia a conexão
   */
  connect(): void {
    if (this.status === 'connecting' || this.status === 'connected') {
      return;
    }

    this.setStatus('connecting');
    this.tryConnect();
  }

  /**
   * Desconecta e limpa recursos
   */
  disconnect(): void {
    this.cleanup();
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
    this.currentFallbackIndex = 0;
  }

  /**
   * Reconecta manualmente
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.currentFallbackIndex = 0;
    this.connect();
  }

  /**
   * Registra listener para um evento específico
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Registra listener para todos os eventos
   */
  onAny(callback: (event: string, data: unknown) => void): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Registra callback para mudanças de status
   */
  onStatusChange(callback: (status: ConnectionStatus, transport: TransportType | null) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Registra callback para erros
   */
  onError(callback: (error: Error, transport: TransportType | null) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Envia dados (apenas para WebSocket)
   */
  emit(event: string, data?: unknown): boolean {
    if (this.transport !== 'websocket' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Realtime] Cannot emit: not connected via WebSocket');
      return false;
    }
    
    try {
      const message = JSON.stringify({ type: event, ...((typeof data === 'object' && data !== null) ? data : { data }) });
      this.ws.send(message);
      return true;
    } catch (err) {
      console.error('[Realtime] Emit error:', err);
      return false;
    }
  }

  /**
   * Envia ping (keepalive)
   */
  ping(): boolean {
    return this.emit('ping');
  }

  /**
   * Força o uso de um transporte específico
   */
  forceTransport(transport: TransportType): void {
    this.disconnect();
    const index = this.fallbackOrder.indexOf(transport);
    if (index >= 0) {
      this.currentFallbackIndex = index;
    }
    this.connect();
  }

  /**
   * Tenta conectar com o transporte atual
   */
  private tryConnect(): void {
    const transport = this.fallbackOrder[this.currentFallbackIndex];
    
    if (!transport) {
      console.error('[Realtime] Exhausted all transport options');
      this.setStatus('error');
      this.notifyError(new Error('All transport options exhausted'), null);
      return;
    }

    if (!isTransportSupported(transport)) {
      this.currentFallbackIndex++;
      this.tryConnect();
      return;
    }
    this.transport = transport;

    switch (transport) {
      case 'websocket':
        this.connectWebSocket();
        break;
      case 'sse':
        this.connectSSE();
        break;
      case 'polling':
        this.connectPolling();
        break;
    }
  }

  /**
   * Conecta via WebSocket
   */
  private connectWebSocket(): void {
    try {
      const url = this.buildUrl('websocket');
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (this.token) {
          this.ws!.send(JSON.stringify({ type: 'auth', token: this.token }));
        }
        // onConnectSuccess is triggered when server sends connection_established
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connection_established') {
            this.onConnectSuccess();
            this.startPingInterval();
            return;
          }
          this.handleMessage(data);
        } catch (err) {
          console.error('[Realtime] WebSocket parse error:', err);
        }
      };
      
      this.ws.onclose = (e) => {
        this.onConnectError(new Error(`WebSocket closed: ${e.code} ${e.reason}`));
      };
      
      this.ws.onerror = (e) => {
        console.error('[Realtime] WebSocket error:', e);
        this.onConnectError(new Error('WebSocket error'));
      };
    } catch (err) {
      console.error('[Realtime] WebSocket connection error:', err);
      this.onConnectError(err as Error);
    }
  }

  /**
   * Conecta via Server-Sent Events
   */
  private connectSSE(): void {
    try {
      const url = this.buildUrl('sse');
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.onConnectSuccess();
      };
      
      this.eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('[Realtime] SSE parse error:', err);
        }
      };
      
      // Eventos específicos do SSE
      this.eventSource.addEventListener('order_created', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emitEvent('order_created', data);
        } catch (err) {
          console.error('[Realtime] SSE event error:', err);
        }
      });
      
      this.eventSource.addEventListener('order_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emitEvent('order_updated', data);
        } catch (err) {
          console.error('[Realtime] SSE event error:', err);
        }
      });
      
      this.eventSource.addEventListener('payment_received', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emitEvent('payment_received', data);
        } catch (err) {
          console.error('[Realtime] SSE event error:', err);
        }
      });
      
      this.eventSource.onerror = (e) => {
        console.error('[Realtime] SSE error:', e);
        this.onConnectError(new Error('SSE error'));
      };
    } catch (err) {
      console.error('[Realtime] SSE connection error:', err);
      this.onConnectError(err as Error);
    }
  }

  /**
   * Conecta via HTTP Polling
   */
  private connectPolling(): void {
    this.pollingController = new AbortController();
    this.doPoll();
  }

  /**
   * Executa uma requisição de polling
   */
  private async doPoll(): Promise<void> {
    if (this.transport !== 'polling' || this.status === 'disconnected') {
      return;
    }

    try {
      const url = this.buildUrl('polling');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...buildAuthHeader(this.token),
        },
        signal: this.pollingController?.signal,
      });

      // 429 (rate limit): NÃO cascatear para outros transportes / reconexão.
      // Isso é o que causava a tempestade de requests. Respeitamos Retry-After
      // (ou backoff exponencial) e continuamos no mesmo transporte de polling.
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
        const nextBackoff = retryAfter ?? ((this.pollBackoffMs * 2) || this.pollBaseMs);
        this.pollBackoffMs = Math.min(
          Math.max(nextBackoff, this.pollBaseMs),
          this.pollMaxBackoffMs,
        );
        console.warn(`[Realtime] Polling 429 — backoff ${Math.round(this.pollBackoffMs / 1000)}s`);
        this.schedulePoll(this.pollBackoffMs);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json() as PollingOrderSnapshot[] | PaginatedPayload<PollingOrderSnapshot> | null;

      // Resposta OK: zera backoff de rate limit.
      this.pollBackoffMs = 0;

      // Primeira resposta bem-sucedida = conectado
      if (this.status !== 'connected') {
        this.onConnectSuccess();
      }

      const orders = Array.isArray(payload) ? payload : (payload?.results || []);
      this.processPollingOrders(orders);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return; // Polling cancelado intencionalmente
      }
      console.error('[Realtime] Polling error:', err);
      this.onConnectError(err as Error);
      return;
    }

    // Agendar próximo poll com jitter (±15%) para evitar sincronização entre abas.
    this.schedulePoll(this.pollBaseMs);
  }

  /**
   * Agenda o próximo poll, se ainda estivermos em modo polling.
   * Aplica jitter para dispersar requests de múltiplas abas/clientes.
   */
  private schedulePoll(delayMs: number): void {
    if (this.transport !== 'polling' || this.status === 'disconnected') {
      return;
    }
    const jitter = delayMs * (0.85 + Math.random() * 0.3);
    this.pollingInterval = window.setTimeout(() => this.doPoll(), jitter);
  }

  /**
   * Converte o header Retry-After (segundos ou data HTTP) em milissegundos.
   */
  private parseRetryAfter(value: string | null): number | null {
    if (!value) return null;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber * 1000;
    const asDate = Date.parse(value);
    if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
    return null;
  }

  /**
   * Constrói a URL para o transporte especificado
   */
  private buildUrl(transport: TransportType): string {
    const wsHost = this.getWSHost();
    const storeSlug = this.options.storeSlug || 'default';
    const token = this.token;
    
    switch (transport) {
      case 'websocket': {
        const proto = this.isSecure() ? 'wss' : 'ws';
        return `${proto}://${wsHost}/ws/stores/${storeSlug}/orders/`;
      }
      case 'sse': {
        const httpProto = this.isSecure() ? 'https' : 'http';
        return `${httpProto}://${wsHost}/api/sse/orders/?token=${token}&store_id=${storeSlug}`;
      }
      case 'polling': {
        const httpProto = this.isSecure() ? 'https' : 'http';
        const params = new URLSearchParams();
        params.set('store', storeSlug);
        params.set('page_size', '50');
        params.set('ordering', '-updated_at');
        return `${httpProto}://${wsHost}/api/v1/stores/orders/?${params.toString()}`;
      }
    }
  }

  /**
   * Compara snapshot do polling e emite eventos sintéticos.
   */
  private processPollingOrders(orders: PollingOrderSnapshot[]): void {
    const nextSnapshot = new Map<string, PollingOrderSnapshot>();

    for (const order of orders) {
      nextSnapshot.set(order.id, order);
    }

    if (!this.pollingBaselineReady) {
      this.pollingSnapshot = nextSnapshot;
      this.pollingBaselineReady = true;
      return;
    }

    orders.forEach((order) => {
      const previous = this.pollingSnapshot.get(order.id);

      if (!previous) {
        this.emitEvent('order_created', {
          type: 'order.created',
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total: order.total,
          created_at: order.created_at,
          status: order.status,
          payment_status: order.payment_status,
        });
        return;
      }

      const statusChanged = previous.status !== order.status;
      const paymentChanged = previous.payment_status !== order.payment_status;
      const updatedChanged = previous.updated_at !== order.updated_at;

      if (paymentChanged && order.payment_status === 'paid') {
        this.emitEvent('payment_received', {
          type: 'order.paid',
          order_id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
          status: order.status,
          updated_at: order.updated_at,
        });
        return;
      }

      if (statusChanged || paymentChanged || updatedChanged) {
        const normalizedType = order.status === 'cancelled' ? 'order_cancelled' : 'order_updated';
        this.emitEvent(normalizedType, {
          type: order.status === 'cancelled' ? 'order.cancelled' : 'order.updated',
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          updated_at: order.updated_at,
        });
      }
    });

    this.pollingSnapshot = nextSnapshot;
  }

  /**
   * Retorna o host WebSocket
   */
  private getWSHost(): string {
    let wsHost: string | undefined = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_WS_HOST : undefined;
    if (!wsHost) {
      const apiUrl: string = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL || '') : '';
      if (apiUrl) {
        try {
          wsHost = new URL(apiUrl).host;
        } catch {
          wsHost = window.location.host;
        }
      } else {
        wsHost = window.location.host;
      }
    }
    return wsHost;
  }

  /**
   * Verifica se deve usar conexão segura
   */
  private isSecure(): boolean {
    const wsHost = this.getWSHost();
    return wsHost.includes('railway') || 
           wsHost.includes('vercel') || 
           window.location.protocol === 'https:';
  }

  /**
   * Chamado quando a conexão é bem-sucedida
   */
  private onConnectSuccess(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;
  }

  /**
   * Chamado quando há erro de conexão
   */
  private onConnectError(error: Error): void {
    this.cleanupTransport();
    this.notifyError(error, this.transport);

    // Tentar próximo transporte
    this.currentFallbackIndex++;
    
    if (this.currentFallbackIndex < this.fallbackOrder.length) {
      this.tryConnect();
    } else {
      // Todos os transportes falharam, tentar reconexão
      this.scheduleReconnect();
    }
  }

  /**
   * Agenda reconexão com backoff exponencial
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Realtime] Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.setStatus('connecting');

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.currentFallbackIndex = 0; // Resetar para tentar WebSocket novamente
      this.tryConnect();
    }, delay);
  }

  /**
   * Processa mensagem recebida
   */
  private handleMessage(data: Record<string, unknown>): void {
    // Ignorar pings/pongs
    if (data.type === 'ping' || data.type === 'pong') {
      return;
    }

    // Normalizar nomes de eventos
    const eventMap: Record<string, string> = {
      'order.created': 'order_created',
      'order.updated': 'order_updated',
      'order.paid': 'payment_received',
      'order.cancelled': 'order_cancelled',
      'order.status_changed': 'order_updated',
    };

    const eventType = (data.type as string) || 'message';
    const normalizedEvent = eventMap[eventType] || eventType;

    this.emitEvent(normalizedEvent, data);
  }

  /**
   * Emite evento para listeners
   */
  private emitEvent(event: string, data: unknown): void {

    // Listeners específicos do evento
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('[Realtime] Callback error:', e);
        }
      });
    }

    // Listeners globais
    this.globalListeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error('[Realtime] Global callback error:', e);
      }
    });

    // Wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('[Realtime] Wildcard callback error:', e);
        }
      });
    }
  }

  /**
   * Atualiza o status e notifica listeners
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => {
      try {
        cb(status, this.transport);
      } catch (e) {
        console.error('[Realtime] Status callback error:', e);
      }
    });
  }

  /**
   * Notifica listeners de erro
   */
  private notifyError(error: Error, transport: TransportType | null): void {
    this.errorCallbacks.forEach(cb => {
      try {
        cb(error, transport);
      } catch (e) {
        console.error('[Realtime] Error callback error:', e);
      }
    });
  }

  /**
   * Inicia intervalo de ping
   */
  private startPingInterval(): void {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
    }
    
    this.pingTimer = window.setInterval(() => {
      if (this.transport === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
        this.ping();
      }
    }, this.pingInterval);
  }

  /**
   * Limpa recursos do transporte atual
   */
  private cleanupTransport(): void {
    // Limpar WebSocket
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // Limpar SSE
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Limpar Polling
    if (this.pollingInterval) {
      window.clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.pollingController) {
      this.pollingController.abort();
      this.pollingController = null;
    }

    // Limpar ping
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    this.transport = null;
    this.pollingBaselineReady = false;
    this.pollingSnapshot.clear();
  }

  /**
   * Limpa todos os recursos
   */
  private cleanup(): void {
    this.cleanupTransport();
    
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * Cria uma instância singleton de RealtimeConnection
 */
let globalConnection: RealtimeConnection | null = null;

export function createRealtimeConnection(options: ConnectionOptions): RealtimeConnection {
  return new RealtimeConnection(options);
}

export function getGlobalConnection(): RealtimeConnection | null {
  return globalConnection;
}

export function setGlobalConnection(connection: RealtimeConnection | null): void {
  globalConnection = connection;
}

/**
 * Hook helper para obter URL WebSocket (backwards compatibility)
 */
export function getWebSocketUrl(path: string): string {
  let wsHost: string | undefined = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_WS_HOST : undefined;
  if (!wsHost) {
    const apiUrl: string = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL || '') : '';
    if (apiUrl) {
      try {
        wsHost = new URL(apiUrl).host;
      } catch {
        wsHost = window.location.host;
      }
    } else {
      wsHost = window.location.host;
    }
  }
  const proto = wsHost.includes('railway') || wsHost.includes('vercel') || window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${wsHost}${path}`;
}

export default RealtimeConnection;
