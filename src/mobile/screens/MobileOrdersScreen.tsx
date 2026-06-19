// src/mobile/screens/MobileOrdersScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { getOrders, updateOrderStatus } from '../../services/storesApi';
import { COLUMNS, statusToColumn } from '../../pages/orders/orderColumns';
import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';
import { PushOptInBanner } from '../PushOptInBanner';
import type { StoreOrder } from '../../services/storesApi';

export const MobileOrdersScreen: React.FC = () => {
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

  const advance = async (order: StoreOrder) => {
    const next = nextOrderStatus(order.status);
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
    return <div className="p-4 text-fg-muted">Selecione uma loja para ver os pedidos.</div>;
  }

  return (
    <div className="pb-4">
      <PushOptInBanner />
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => statusToColumn(o.status) === col.id);
        if (colOrders.length === 0) return null;
        return (
          <section key={col.id} className="px-3 pt-3">
            <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
              {col.label} <span className="text-fg-muted">({colOrders.length})</span>
            </h2>
            <ul className="space-y-2">
              {colOrders.map((order) => {
                const next = nextOrderStatus(order.status);
                return (
                  <li key={order.id} className="rounded-xl bg-bg-card border border-border-primary p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg-primary">{order.order_number}</span>
                      <span className="text-sm text-fg-secondary">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-fg-secondary">{order.customer_name}</div>
                    <div className="mt-1 text-xs text-fg-muted">{STATUS_LABEL[order.status] ?? order.status}</div>
                    {next && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => advance(order)}
                        className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {next.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
