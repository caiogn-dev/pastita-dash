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
import { createWebSocket, clearWebSocketInstance } from '../services/websocket';
import { applyOrderEventToOrders, type OrderRealtimeEvent } from './orderRealtimeEvents';

export { applyOrderEventToOrders };
export type { OrderRealtimeEvent };

export interface UseRealTimeOrdersConfig {
  enabled?: boolean;
  apiUrl: string;
  wsUrl: string;
}

export function useRealTimeOrders(config: UseRealTimeOrdersConfig) {
  const { enabled = true, apiUrl, wsUrl } = config;
  // Selectors estreitos: não re-renderizar a cada mudança em qualquer pedido
  const authToken = useRootStore((s) => s.auth.token);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const wsRef = useRef<ReturnType<typeof createWebSocket> | null>(null);
  const refreshAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !authToken || !selectedStoreId) {
      return;
    }

    const initWebSocket = async () => {
      const ws = createWebSocket({
        url: wsUrl,
        token: authToken!,
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
        // Pedido novo: o payload do evento não traz items — precisa refetch
        refreshOrdersFromAPI();
      });

      ws.subscribe('order.updated', (event) => {
        console.log('Order updated:', event.order_id, event.status);
        applyEventOrRefresh(event as OrderRealtimeEvent);
      });

      ws.subscribe('order.payment_received', (event) => {
        console.log('Payment received:', event.order_id, event.amount);
        applyEventOrRefresh(event as OrderRealtimeEvent);
      });

      // Listen for connection events
      ws.on('connected', () => {
        console.log('WebSocket connected');
      });

      ws.on('disconnected', () => {
        console.log('WebSocket disconnected - will reconnect automatically');
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    };

    initWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      refreshAbortRef.current?.abort();
      refreshAbortRef.current = null;
      clearWebSocketInstance();
    };
  }, [enabled, authToken, selectedStoreId, wsUrl]);

  // Patch incremental: aplica o evento direto na store sem refetch da lista
  // inteira. Só refetch quando o pedido não está na lista (página filtrada,
  // pedido fora do page_size etc.).
  const applyEventOrRefresh = (event: OrderRealtimeEvent) => {
    if (!selectedStoreId) return;
    const { orders, setOrders } = useRootStore.getState();
    const current = orders[selectedStoreId] || [];
    const next = applyOrderEventToOrders(current, event);
    if (next === null) {
      refreshOrdersFromAPI();
      return;
    }
    setOrders(selectedStoreId, next);
  };

  const refreshOrdersFromAPI = async () => {
    if (!selectedStoreId || !authToken) return;

    // Cancela refresh anterior em voo: vários eventos WS em sequência disparavam
    // fetches concorrentes e a resposta mais antiga podia sobrescrever a mais nova.
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    // apiUrl já é a base (VITE_API_URL, que inclui /api/v1). NÃO concatenar /api/v1
    // de novo — antes gerava `.../api/v1/stores/x/orders//api/v1/stores/x/orders/`.
    try {
      const response = await fetch(
        `${apiUrl}/stores/${selectedStoreId}/orders/`,
        {
          headers: {
            Authorization: `Token ${authToken}`,
          },
          signal: controller.signal,
        }
      );

      if (response.ok) {
        const data = await response.json();
        useRootStore.getState().setOrders(selectedStoreId, data.results || []);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to refresh orders:', error);
      }
    }
  };

  return {
    isConnected: wsRef.current !== null,
    reconnect: async () => {
      if (wsRef.current && selectedStoreId && authToken) {
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
