/**
 * Hook for real-time order updates via WebSocket
 * Connects to /ws/stores/{store_slug}/orders/
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

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
}

export const useOrdersWebSocket = (options: UseOrdersWebSocketOptions = {}) => {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<OrderUpdate | null>(null);

  const {
    onOrderCreated,
    onOrderUpdated,
    onStatusChanged,
    onPaymentReceived,
    autoReconnect = true,
  } = options;

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${protocol}//${host}/ws/stores/${STORE_SLUG}/orders/?token=${token}`;
  }, [token]);

  const connect = useCallback(() => {
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log('Connecting to orders WebSocket');
      
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('Orders WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: OrderUpdate = JSON.parse(event.data);
          console.debug('Orders WebSocket message:', data.type);
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
            default:
              console.debug('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Orders WebSocket disconnected:', event.code);
        setIsConnected(false);

        if (autoReconnect && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = () => {
        console.error('Orders WebSocket error');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [token, getWebSocketUrl, autoReconnect, onOrderCreated, onOrderUpdated, onStatusChanged, onPaymentReceived]);

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
      logger.warn('WebSocket not connected, cannot send message');
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
    connect,
    disconnect,
    send,
  };
};

export default useOrdersWebSocket;
