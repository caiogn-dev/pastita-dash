/**
 * Global WebSocket Context com Fallback SSE/Polling
 * 
 * Este contexto foi atualizado para usar RealtimeConnection com fallback automático:
 * WebSocket → SSE → HTTP Polling
 * 
 * Mantém compatibilidade total com código existente.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useStore } from '../hooks/useStore';
import { 
  RealtimeConnection, 
  TransportType, 
  ConnectionStatus,
  createRealtimeConnection,
  detectTransportCapabilities,
  getGlobalConnection,
  setGlobalConnection
} from '../services/realtime';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

interface OrderEvent {
  type: string;
  order_id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  [key: string]: unknown;
}

type Callback = (data: OrderEvent) => void;

interface WSContextValue {
  isConnected: boolean;
  error: string | null;
  on: (event: string, cb: Callback) => () => void;
  // Novos campos para fallback
  transport: TransportType | null;
  status: ConnectionStatus;
  reconnect: () => void;
  forceTransport: (transport: TransportType) => void;
  capabilities: ReturnType<typeof detectTransportCapabilities>;
}

const WSContext = createContext<WSContextValue | null>(null);

/**
 * WebSocket Provider com Fallback Automático
 * 
 * Usa RealtimeConnection para tentar WebSocket primeiro,
 * fallback para SSE, e finalmente HTTP Polling.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const { storeSlug, storeId } = useStore();
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const listenersRef = useRef<Map<string, Set<Callback>>>(new Map());
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transport, setTransport] = useState<TransportType | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  const effectiveStoreSlug = storeSlug || storeId || STORE_SLUG;

  // Obter token efetivo (do store ou localStorage)
  const getEffectiveToken = useCallback(() => {
    let effectiveToken = token;
    if (!effectiveToken && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          effectiveToken = parsed?.state?.token || undefined;
          if (effectiveToken) console.debug('[WS] using token from localStorage');
        }
      } catch (e) {
        // ignore
      }
    }
    return effectiveToken;
  }, [token]);

  // Criar/reutilizar conexão
  useEffect(() => {
    const effectiveToken = getEffectiveToken();
    
    if (!effectiveToken) {
      console.log('[WS] No token, skipping connection');
      return;
    }

    // Reutilizar conexão global se existir
    let connection = getGlobalConnection();
    
    if (!connection) {
      console.log('[WS] Creating new RealtimeConnection with fallback support');
      connection = createRealtimeConnection({
        url: '',
        token: effectiveToken,
        storeSlug: effectiveStoreSlug,
        fallbackOrder: ['websocket', 'sse', 'polling'],
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
      setIsConnected(newStatus === 'connected');
      
      if (newStatus === 'error') {
        setError('Erro de conexão. Tentando reconectar...');
      } else if (newStatus === 'connecting') {
        setError('Conectando...');
      } else {
        setError(null);
      }
      
      // Log de mudança de transporte
      if (newTransport) {
        console.log(`[WS] Transport changed to: ${newTransport} (${newStatus})`);
      }
    });

    // Inscrever em erros
    const unsubError = connection.onError((err, transportType) => {
      console.error('[WS] Connection error:', err, 'on transport:', transportType);
      setError(err.message);
    });

    // Sincronizar listeners existentes com a nova conexão
    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        connection!.on(event, cb as (data: unknown) => void);
      });
    });

    // Conectar automaticamente
    connection.connect();

    // Estado inicial
    setStatus(connection.getStatus());
    setTransport(connection.getTransport());
    setIsConnected(connection.isConnected());

    return () => {
      unsubStatus();
      unsubError();
      // Não desconectar aqui - a conexão é singleton
    };
  }, [getEffectiveToken, effectiveStoreSlug]);

  // Reconectar quando a aba volta a ficar visível
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && connectionRef.current) {
        if (!connectionRef.current.isConnected()) {
          console.log('[WS] Tab visible, reconnecting...');
          connectionRef.current.reconnect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', onVisible);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Emitir evento para listeners locais
  const emit = useCallback((event: string, data: OrderEvent) => {
    const eventListeners = listenersRef.current.get(event);
    const wildcardListeners = listenersRef.current.get('*');
    
    console.log(`[WS] Event: ${event}`, data);
    console.log(`[WS] Listeners for '${event}':`, eventListeners?.size || 0);
    
    eventListeners?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('[WS] Callback error:', e);
      }
    });
    
    wildcardListeners?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('[WS] Wildcard callback error:', e);
      }
    });
  }, []);

  // Subscribe to events
  const on = useCallback((event: string, cb: Callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(cb);
    
    console.log(`[WS] Subscribed to '${event}' (total: ${listenersRef.current.get(event)!.size})`);
    
    // Também registrar na conexão realtime se disponível
    if (connectionRef.current) {
      connectionRef.current.on(event, cb as (data: unknown) => void);
    }
    
    return () => {
      listenersRef.current.get(event)?.delete(cb);
      console.log(`[WS] Unsubscribed from '${event}'`);
    };
  }, []);

  // Reconectar manualmente
  const reconnect = useCallback(() => {
    if (connectionRef.current) {
      console.log('[WS] Manual reconnect triggered');
      connectionRef.current.reconnect();
    }
  }, []);

  // Forçar transporte específico
  const forceTransport = useCallback((t: TransportType) => {
    if (connectionRef.current) {
      console.log(`[WS] Forcing transport to: ${t}`);
      connectionRef.current.forceTransport(t);
    }
  }, []);

  const value: WSContextValue = {
    isConnected,
    error,
    on,
    transport,
    status,
    reconnect,
    forceTransport,
    capabilities: detectTransportCapabilities(),
  };

  return (
    <WSContext.Provider value={value}>
      {children}
    </WSContext.Provider>
  );
}

/**
 * Hook para acessar o WebSocket context
 * Mantém compatibilidade total com código existente
 */
export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be inside WebSocketProvider');
  return ctx;
}

/**
 * Componente de indicador de conexão com info de transporte
 * Pode ser usado para debug ou feedback visual
 */
export function ConnectionStatusIndicator() {
  const { isConnected, error, transport, status, capabilities } = useWS();
  
  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (status === 'connecting') return 'bg-yellow-500';
    if (status === 'error') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getTransportLabel = () => {
    switch (transport) {
      case 'websocket': return 'WebSocket ⚡';
      case 'sse': return 'SSE 📡';
      case 'polling': return 'Polling 🔄';
      default: return 'Nenhum';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm">
      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      <span className="text-gray-600 dark:text-gray-400">
        {isConnected ? `Conectado (${getTransportLabel()})` : (error || 'Desconectado')}
      </span>
      {!capabilities.websocket && (
        <span className="text-xs text-orange-500">(WebSocket não suportado)</span>
      )}
      {!capabilities.sse && (
        <span className="text-xs text-orange-500">(SSE não suportado)</span>
      )}
    </div>
  );
}

// Re-export para conveniência
export { detectTransportCapabilities };
export type { TransportType, ConnectionStatus };
