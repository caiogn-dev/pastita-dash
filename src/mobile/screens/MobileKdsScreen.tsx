// src/mobile/screens/MobileKdsScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { getOrders, updateOrderStatus } from '../../services/storesApi';
import { KDS_COLUMNS, groupKdsOrders, type KdsColumnId } from '../../pages/kds/kdsColumns';
import type { StoreOrder } from '../../services/storesApi';

const KDS_NEXT: Partial<Record<KdsColumnId, { status: string; label: string }>> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
};

export const MobileKdsScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const orders = useRootStore((s) => (storeId ? s.orders[storeId] : undefined)) ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  useEffect(() => {
    if (!storeId) return;
    getOrders({ store: storeId }).then((res) => {
      useRootStore.getState().setOrders(storeId, res.results);
    });
  }, [storeId]);

  const advance = async (order: StoreOrder, columnId: KdsColumnId) => {
    const next = KDS_NEXT[columnId];
    if (!next || !storeId) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      const current = useRootStore.getState().orders[storeId] || [];
      useRootStore.getState().setOrders(
        storeId,
        current.map((o) => (o.id === order.id ? { ...o, status: next.status } : o)),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!storeId) {
    return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;
  }

  const grouped = groupKdsOrders(orders);

  return (
    <div className="pb-4">
      {KDS_COLUMNS.map((col) => {
        const colOrders = grouped[col.id] ?? [];
        const next = KDS_NEXT[col.id];
        return (
          <section key={col.id} className="px-3 pt-3">
            <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
              {col.label} <span className="text-fg-muted">({colOrders.length})</span>
            </h2>
            <ul className="space-y-2">
              {colOrders.map((order) => (
                <li key={order.id} className="rounded-xl bg-bg-card border border-border-primary p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-fg-primary">{order.order_number}</span>
                    <span className="text-sm text-fg-secondary">{order.items?.length ?? 0} itens</span>
                  </div>
                  {next && (
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => advance(order, col.id)}
                      className="mt-3 w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60"
                    >
                      {next.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
