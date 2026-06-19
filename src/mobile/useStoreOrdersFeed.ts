// src/mobile/useStoreOrdersFeed.ts
import { useCallback, useEffect, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import { useRealTimeOrders } from '../hooks/useRealTimeOrders';
import { getOrders } from '../services/storesApi';
import type { StoreOrder } from '../services/storesApi';

export interface StoreOrdersFeed {
  orders: StoreOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStoreOrdersFeed(): StoreOrdersFeed {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const orders = useRootStore((s) => (storeId ? s.orders[storeId] : undefined)) ?? [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ store: storeId, page_size: 50 });
      useRootStore.getState().setOrders(storeId, res.results);
    } catch {
      setError('Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { orders, loading, error, refetch: load };
}
