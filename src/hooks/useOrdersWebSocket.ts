/**
 * Hook for real-time order updates via WebSocket
 * Connects to /ws/stores/{store_slug}/orders/
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping mechanism to keep connection alive
 * - Graceful handling of server resource limits
 * - Connection state management
 * - Visibility-based reconnection (reconnects when tab becomes visible)
 */
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY = 60000; // 1 minute max
const HEARTBEAT_INTERVAL = 25000; // Send ping every 25 seconds

interface OrderUpdate {
  type: 'order_created' | 'order_updated' | 'order_status_changed' | 'payment_received' | 'order.created' | 'order.updated' | 'order.paid' | 'connection_established' | 'pong';
  order_id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  heartbeat_interval?: number;
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
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<OrderUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Store options in refs to avoid dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const {
    autoReconnect = true,
    enabled = true,
  } = options;

  // Main connection effect - only depends on token and enabled
  useEffect(() => {
    isMountedRef.current = true;
    
    const getWebSocketUrl = () => {
      let wsHost = import.meta.env.VITE_WS_HOST;
      
      if (!wsHost) {
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
      
      const isSecure = wsHost.includes('railway.app') || 
                       wsHost.includes('vercel.app') ||
                       wsHost.includes('all-hands.dev') ||
                       window.location.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      
      return `${protocol}//${wsHost}/ws/stores/${STORE_SLUG}/orders/?token=${token}`;
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    const connect = () => {
      if (!enabled || !token || !isMountedRef.current) {
        return;
      }

      if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      isConnectingRef.current = true;

      try {
        const url = getWebSocketUrl();
        console.log('[WS] Connecting:', url.replace(/token=.*/, 'token=***'));
        
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close();
            return;
          }
          console.log('[WS] Connected');
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;
          isConnectingRef.current = false;
          startHeartbeat();
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          
          try {
            const data: OrderUpdate = JSON.parse(event.data);
            
            if (data.type === 'pong' || data.type === 'connection_established') {
              return;
            }
            
            setLastMessage(data);
            
            const opts = optionsRef.current;
            switch (data.type) {
              case 'order_created':
              case 'order.created':
                opts.onOrderCreated?.(data);
                break;
              case 'order_updated':
              case 'order.updated':
                opts.onOrderUpdated?.(data);
                break;
              case 'order_status_changed':
                opts.onStatusChanged?.(data);
                break;
              case 'payment_received':
              case 'order.paid':
                opts.onPaymentReceived?.(data);
                break;
            }
          } catch (error) {
            console.error('[WS] Parse error:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('[WS] Closed:', event.code);
          stopHeartbeat();
          isConnectingRef.current = false;
          
          if (!isMountedRef.current) return;
          
          setIsConnected(false);

          if (event.code === 4003) {
            setConnectionError('Acesso negado');
            return;
          }

          if (event.code !== 1000 && autoReconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), MAX_RECONNECT_DELAY);
            console.log(`[WS] Reconnecting in ${Math.round(delay)}ms`);
            setConnectionError('Reconectando...');
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                reconnectAttemptsRef.current++;
                connect();
              }
            }, delay);
          }
        };

        ws.onerror = () => {
          console.error('[WS] Error');
          isConnectingRef.current = false;
        };
      } catch (error) {
        console.error('[WS] Create error:', error);
        isConnectingRef.current = false;
      }
    };

    // Connect
    connect();

    // Visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [token, enabled, autoReconnect]); // Only essential dependencies

  const send = (data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
    }
  };

  const reconnect = () => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    // The effect will reconnect automatically
  };

  return {
    isConnected,
    lastMessage,
    connectionError,
    send,
    disconnect,
    reconnect,
  };
};

export default useOrdersWebSocket;
