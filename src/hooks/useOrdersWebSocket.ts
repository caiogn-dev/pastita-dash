/**
 * Hook for real-time order updates via WebSocket
 * Connects to /ws/stores/{store_slug}/orders/
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Graceful handling of server resource limits
 * - Connection state management
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 60000; // 1 minute max

interface OrderUpdate {
  type: 'order_created' | 'order_updated' | 'order_status_changed' | 'payment_received';
  order_id: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  data?: Record<string, unknown>;
}

interface UseOrdersWebSocketOptions {
  onOrderCreated?: (data: OrderUpdate) => void;
  onOrderUpdated?: (data: OrderUpdate) => void;
  onStatusChanged?: (data: OrderUpdate) => void;
  onPaymentReceived?: (data: OrderUpdate) => void;
  autoReconnect?: boolean;
  enabled?: boolean;
}

export const useOrdersWebSocket = (options: UseOrdersWebSocketOptions = {}) => {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<OrderUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    onOrderCreated,
    onOrderUpdated,
    onStatusChanged,
    onPaymentReceived,
    autoReconnect = true,
    enabled = true,
  } = options;

  const getWebSocketUrl = useCallback(() => {
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
          // Fallback to window.location.host
          wsHost = window.location.host;
        }
      } else {
        wsHost = window.location.host;
      }
    }
    
    // Determine protocol based on host (production uses wss)
    const isSecure = wsHost.includes('railway.app') || 
                     wsHost.includes('vercel.app') || 
                     window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    
    const url = `${protocol}//${wsHost}/ws/stores/${STORE_SLUG}/orders/?token=${token}`;
    console.log('WebSocket URL:', url);
    return url;
  }, [token]);

  const connect = useCallback(() => {
    if (!enabled || !token) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close any existing connection first
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectingRef.current = true;

    try {
      const url = getWebSocketUrl();
      console.log('Connecting to orders WebSocket');
      
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('Orders WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: OrderUpdate = JSON.parse(event.data);
          setLastMessage(data);

          switch (data.type) {
            case 'order_created':
              onOrderCreated?.(data);
              break;
            case 'order_updated':
              onOrderUpdated?.(data);
              break;
            case 'order_status_changed':
              onStatusChanged?.(data);
              break;
            case 'payment_received':
              onPaymentReceived?.(data);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Orders WebSocket disconnected:', event.code);
        setIsConnected(false);
        isConnectingRef.current = false;

        // Handle specific close codes
        if (event.code === 1006) {
          // Abnormal closure - could be server resource limits
          setConnectionError('Conexão perdida. Tentando reconectar...');
        }

        if (autoReconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          // Exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), MAX_RECONNECT_DELAY);
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          
          console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Não foi possível conectar ao servidor. Atualize a página para tentar novamente.');
        }
      };

      wsRef.current.onerror = () => {
        console.error('Orders WebSocket error');
        isConnectingRef.current = false;
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, [enabled, token, getWebSocketUrl, autoReconnect, onOrderCreated, onOrderUpdated, onStatusChanged, onPaymentReceived]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    send,
  };
};

export default useOrdersWebSocket;
