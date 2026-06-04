/**
 * Hook to integrate WebSocket real-time updates with Zustand store
 * 
 * Automatically:
 * - Connects to WebSocket on mount
 * - Updates order state on events
 * - Disconnects on unmount
 * - Handles reconnection
 */

import { useEffect, useRef } from 'react';
import { useRootStore } from '../stores/rootStore';
import { useWebSocket, clearWebSocketInstance } from '../services/websocket';

export interface UseRealTimeOrdersConfig {
  enabled?: boolean;
  apiUrl: string;
  wsUrl: string;
}

export function useRealTimeOrders(config: UseRealTimeOrdersConfig) {
  const { enabled = true, apiUrl, wsUrl } = config;
  const { auth, selectedStoreId, orders, setOrders } = useRootStore();
  const wsRef = useRef<ReturnType<typeof useWebSocket> | null>(null);

  useEffect(() => {
    if (!enabled || !auth.token || !selectedStoreId) {
      return;
    }

    const initWebSocket = async () => {
      const ws = useWebSocket({
        url: wsUrl,
        token: auth.token!,
        storeSlug: selectedStoreId!,
      });

      wsRef.current = ws;

      // Connect
      try {
        await ws.connect();
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        return;
      }

      // Subscribe to order events
      ws.subscribe('order.created', (event) => {
        console.log('Order created:', event.order_id);
        // Refresh orders from API
        refreshOrdersFromAPI();
      });

      ws.subscribe('order.updated', (event) => {
        console.log('Order updated:', event.order_id, event.status);
        // Refresh orders from API
        refreshOrdersFromAPI();
      });

      ws.subscribe('order.payment_received', (event) => {
        console.log('Payment received:', event.order_id, event.amount);
        // Refresh orders from API
        refreshOrdersFromAPI();
      });

      // Listen for connection events
      ws.on('connected', () => {
        console.log('WebSocket connected');
      });

      ws.on('disconnected', () => {
        console.log('WebSocket disconnected - will reconnect automatically');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    };

    initWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      clearWebSocketInstance();
    };
  }, [enabled, auth.token, selectedStoreId, wsUrl]);

  const refreshOrdersFromAPI = async () => {
    if (!selectedStoreId || !auth.token) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/stores/${selectedStoreId}/orders/`,
        {
          headers: {
            Authorization: `Token ${auth.token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(selectedStoreId, data.results || []);
      }
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  return {
    isConnected: wsRef.current !== null,
    reconnect: async () => {
      if (wsRef.current && selectedStoreId && auth.token) {
        try {
          await wsRef.current.connect();
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }
    },
    refreshOrders: refreshOrdersFromAPI,
  };
}
