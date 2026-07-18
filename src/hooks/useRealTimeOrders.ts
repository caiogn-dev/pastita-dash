/**
 * Hook to integrate WebSocket real-time updates with Zustand store
 * 
 * Automatically:
 * - Connects to WebSocket on mount
 * - Updates order state on events
 * - Disconnects on unmount
 * - Handles reconnection
 */

import { useEffect, useRef, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import { useAuthStore } from '../stores/authStore';
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
  // Selectors estreitos: não re-renderizar a cada mudança em qualquer pedido.
  // Token vem do authStore (store persistido, populado no login) — não do
  // rootStore.auth, que ninguém popula. Mesma fonte dos demais hooks de WS.
  const authToken = useAuthStore((s) => s.token);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const selectedStoreSlug = useRootStore((s) => {
    const store = s.stores.find((st) => st.id === s.selectedStoreId);
    return store?.slug ?? null;
  });
  const wsRef = useRef<ReturnType<typeof createWebSocket> | null>(null);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (!enabled || !authToken || !selectedStoreId || !selectedStoreSlug) {
      return;
    }

    const initWebSocket = async () => {
      const ws = createWebSocket({
        url: wsUrl,
        token: authToken!,
        storeSlug: selectedStoreSlug,
      });

      wsRef.current = ws;

      // Reconexões em background (deploy do backend, rede) devem refletir no
      // estado — antes o hook só sabia do connect() inicial e o painel ficava
      // marcado como offline até um F5 mesmo com o WS de volta.
      ws.on('connected', () => {
        setIsConnected(true);
        setConnectionError(false);
      });
      ws.on('disconnected', () => {
        setIsConnected(false);
      });
      ws.on('error', () => {
        setConnectionError(true);
      });

      try {
        await ws.connect();
        setIsConnected(true);
        setConnectionError(false);
      } catch {
        setIsConnected(false);
        setConnectionError(true);
        return;
      }

      // Subscribe to order events (sem console.log — payload contém dados de pedido)
      ws.subscribe('order.created', () => {
        // Pedido novo: o payload do evento não traz items — precisa refetch
        refreshOrdersFromAPI();
      });

      ws.subscribe('order.updated', (event) => {
        applyEventOrRefresh(event as OrderRealtimeEvent);
      });

      ws.subscribe('order.payment_received', (event) => {
        applyEventOrRefresh(event as OrderRealtimeEvent);
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
      setIsConnected(false);
      clearWebSocketInstance();
    };
  }, [enabled, authToken, selectedStoreId, selectedStoreSlug, wsUrl]);

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
    isConnected,
    connectionError,
    reconnect: async () => {
      if (wsRef.current && selectedStoreId && authToken) {
        try {
          await wsRef.current.connect();
          setIsConnected(true);
          setConnectionError(false);
        } catch {
          setIsConnected(false);
          setConnectionError(true);
        }
      }
    },
    refreshOrders: refreshOrdersFromAPI,
  };
}
