/**
 * useRealtime Hook
 * Hook React para usar o serviço RealtimeConnection com fallback automático
 */

import { useEffect, useRef, useState, useCallback, useContext, createContext } from 'react';
import { 
  RealtimeConnection, 
  TransportType, 
  ConnectionStatus,
  createRealtimeConnection,
  detectTransportCapabilities,
  getGlobalConnection,
  setGlobalConnection
} from '../services/realtime';
import { useAuthStore } from '../stores/authStore';
import { useStore } from './useStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

// Context para compartilhar a conexão entre componentes
interface RealtimeContextValue {
  connection: RealtimeConnection | null;
  status: ConnectionStatus;
  transport: TransportType | null;
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: React.ReactNode;
  url?: string;
  autoConnect?: boolean;
  fallbackOrder?: TransportType[];
}

/**
 * Provider para conexão realtime com fallback
 * Substitui o WebSocketProvider antigo
 */
export function RealtimeProvider({ 
  children, 
  url,
  autoConnect = true,
  fallbackOrder = ['websocket', 'sse', 'polling']
}: RealtimeProviderProps) {
  const { token } = useAuthStore();
  const { storeSlug, storeId } = useStore();
  const effectiveStoreSlug = storeSlug || storeId || STORE_SLUG;
  
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [transport, setTransport] = useState<TransportType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Criar conexão
  useEffect(() => {
    if (!token) {
      console.log('[RealtimeProvider] No token, skipping connection creation');
      return;
    }

    // Reutilizar conexão global se existir
    let connection = getGlobalConnection();
    
    if (!connection) {
      connection = createRealtimeConnection({
        url: url || '',
        token,
        storeSlug: effectiveStoreSlug,
        fallbackOrder,
        reconnectAttempts: 10,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        pingInterval: 25000,
      });
      setGlobalConnection(connection);
    }

    connectionRef.current = connection;

    // Inscrever em mudanças de status
    const unsubStatus = connection.onStatusChange((newStatus, newTransport) => {
      setStatus(newStatus);
      setTransport(newTransport);
    });

    // Inscrever em erros
    const unsubError = connection.onError((err) => {
      setError(err);
    });

    // Estado inicial
    setStatus(connection.getStatus());
    setTransport(connection.getTransport());

    return () => {
      unsubStatus();
      unsubError();
    };
  }, [token, url, effectiveStoreSlug, fallbackOrder]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && connectionRef.current && token) {
      connectionRef.current.connect();
    }
  }, [autoConnect, token]);

  // Reconectar quando a aba volta a ficar visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionRef.current) {
        if (!connectionRef.current.isConnected()) {
          console.log('[RealtimeProvider] Tab visible, reconnecting...');
          connectionRef.current.reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const connect = useCallback(() => {
    connectionRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    connectionRef.current?.reconnect();
  }, []);

  const value: RealtimeContextValue = {
    connection: connectionRef.current,
    status,
    transport,
    isConnected: status === 'connected',
    error,
    connect,
    disconnect,
    reconnect,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook para acessar o contexto realtime
 */
export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return ctx;
}

interface UseRealtimeOptions {
  events?: string[];
  onEvent?: (event: string, data: unknown) => void;
  onStatusChange?: (status: ConnectionStatus, transport: TransportType | null) => void;
  onError?: (error: Error, transport: TransportType | null) => void;
}

/**
 * Hook principal para usar realtime com fallback
 * 
 * @example
 * ```tsx
 * const { isConnected, transport, on, emit } = useRealtime({
 *   events: ['order_created', 'order_updated'],
 *   onEvent: (event, data) => console.log(event, data),
 * });
 * ```
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { events = [], onEvent, onStatusChange, onError } = options;
  const ctx = useContext(RealtimeContext);
  
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }

  const { connection, status, transport, isConnected, error } = ctx;
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Inscrever em eventos específicos
  useEffect(() => {
    if (!connection) return;

    // Limpar inscrições anteriores
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    // Inscrever em eventos específicos
    events.forEach(event => {
      const unsub = connection.on(event, (data) => {
        onEvent?.(event, data);
      });
      unsubscribersRef.current.push(unsub);
    });

    // Inscrever em todos os eventos se onEvent fornecido
    if (onEvent) {
      const unsub = connection.onAny((event, data) => {
        onEvent(event, data);
      });
      unsubscribersRef.current.push(unsub);
    }

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [connection, events.join(','), onEvent]);

  // Callbacks de status e erro
  useEffect(() => {
    if (!connection) return;

    const unsubStatus = onStatusChange 
      ? connection.onStatusChange(onStatusChange)
      : () => {};
    
    const unsubError = onError 
      ? connection.onError(onError)
      : () => {};

    return () => {
      unsubStatus();
      unsubError();
    };
  }, [connection, onStatusChange, onError]);

  // Wrapper para on (registrar evento manualmente)
  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!connection) {
      console.warn('[useRealtime] No connection available');
      return () => {};
    }
    return connection.on(event, callback);
  }, [connection]);

  // Wrapper para emit (enviar dados)
  const emit = useCallback((event: string, data?: unknown) => {
    if (!connection) {
      console.warn('[useRealtime] No connection available');
      return false;
    }
    return connection.emit(event, data);
  }, [connection]);

  // Forçar transporte específico
  const forceTransport = useCallback((t: TransportType) => {
    connection?.forceTransport(t);
  }, [connection]);

  return {
    // Estado
    isConnected,
    status,
    transport,
    error,
    
    // Ações
    on,
    emit,
    connect: ctx.connect,
    disconnect: ctx.disconnect,
    reconnect: ctx.reconnect,
    forceTransport,
    
    // Info
    capabilities: detectTransportCapabilities(),
    connectionInfo: connection?.getConnectionInfo(),
  };
}

/**
 * Hook para ouvir eventos específicos de pedidos
 * Backwards compatibility com useOrdersWebSocket
 */
export function useOrderEvents() {
  const { on, isConnected, transport, status } = useRealtime();

  const subscribeToOrders = useCallback((callback: (data: unknown) => void) => {
    const unsubs: (() => void)[] = [];
    
    unsubs.push(on('order_created', callback));
    unsubs.push(on('order_updated', callback));
    unsubs.push(on('payment_received', callback));
    unsubs.push(on('order_cancelled', callback));
    
    return () => unsubs.forEach(unsub => unsub());
  }, [on]);

  return {
    subscribeToOrders,
    isConnected,
    transport,
    status,
  };
}

/**
 * Hook para indicador visual de conexão
 */
export function useConnectionStatus() {
  const { status, transport, isConnected, error } = useRealtimeContext();

  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'error': return 'red';
      case 'disconnected': return 'gray';
      default: return 'gray';
    }
  }, [status]);

  const getStatusText = useCallback(() => {
    if (isConnected && transport) {
      const transportNames: Record<TransportType, string> = {
        websocket: 'WebSocket',
        sse: 'SSE',
        polling: 'HTTP Polling',
      };
      return `Conectado (${transportNames[transport]})`;
    }
    
    switch (status) {
      case 'connecting': return 'Conectando...';
      case 'error': return error?.message || 'Erro de conexão';
      case 'disconnected': return 'Desconectado';
      default: return 'Desconhecido';
    }
  }, [status, transport, isConnected, error]);

  const getTransportIcon = useCallback(() => {
    switch (transport) {
      case 'websocket': return '⚡'; // Lightning
      case 'sse': return '📡'; // Satellite
      case 'polling': return '🔄'; // Refresh
      default: return '⭕';
    }
  }, [transport]);

  return {
    status,
    transport,
    isConnected,
    error,
    statusColor: getStatusColor(),
    statusText: getStatusText(),
    transportIcon: getTransportIcon(),
  };
}

/**
 * Componente de indicador visual de conexão
 * Pode ser usado em qualquer lugar da aplicação
 */
export function ConnectionIndicator() {
  const { 
    isConnected, 
    status, 
    transport, 
    statusColor, 
    statusText, 
    transportIcon 
  } = useConnectionStatus();

  const bgColors: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm">
      <span className="relative flex h-3 w-3">
        {status === 'connecting' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bgColors[statusColor]} opacity-75`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${bgColors[statusColor]}`}></span>
      </span>
      <span className="text-gray-700 dark:text-gray-300">{transportIcon}</span>
      <span className="text-gray-600 dark:text-gray-400">{statusText}</span>
    </div>
  );
}

// Backwards compatibility
export { detectTransportCapabilities };
export type { TransportType, ConnectionStatus, RealtimeConnection };
