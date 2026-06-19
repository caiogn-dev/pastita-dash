import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useMobileOrders } from '../MobileOrdersContext';
import { KDS_COLUMNS, groupKdsOrders, type KdsColumnId } from '../../pages/kds/kdsColumns';
import { updateOrderStatus } from '../../services/storesApi';
import { SkeletonList } from '../ui/Skeleton';
import type { StoreOrder } from '../../services/storesApi';

const KDS_NEXT: Partial<Record<KdsColumnId, { status: string; label: string }>> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
};

export const MobileKdsScreen: React.FC = () => {
  const { orders, loading, error, refetch } = useMobileOrders();
  const [busyId, setBusyId] = useState<string | null>(null);

  const advance = async (order: StoreOrder, columnId: KdsColumnId) => {
    const next = KDS_NEXT[columnId];
    if (!next) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      refetch();
    } catch {
      toast.error('Erro ao atualizar o pedido.');
    } finally {
      setBusyId(null);
    }
  };

  const Header = () => <h1 className="px-3 pt-3 text-lg font-bold text-fg-primary">Cozinha</h1>;

  if (loading && orders.length === 0) return <div><Header /><SkeletonList count={4} /></div>;
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-fg-secondary">{error}</p>
        <button type="button" onClick={refetch} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Tentar novamente</button>
      </div>
    );
  }

  const grouped = groupKdsOrders(orders);
  const total = KDS_COLUMNS.reduce((n, c) => n + (grouped[c.id]?.length ?? 0), 0);

  return (
    <div className="pb-4">
      <Header />
      {total === 0 ? (
        <p className="p-6 text-center text-fg-muted">Cozinha vazia.</p>
      ) : (
        KDS_COLUMNS.map((col) => {
          const colOrders = grouped[col.id] ?? [];
          if (colOrders.length === 0) return null;
          const next = KDS_NEXT[col.id];
          return (
            <section key={col.id} className="px-3 pt-3">
              <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
                {col.label} <span className="text-fg-muted">({colOrders.length})</span>
              </h2>
              <ul className="space-y-2">
                {colOrders.map((order) => (
                  <li key={order.id} className="rounded-xl border border-border-primary bg-bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-fg-primary">{order.order_number}</span>
                      <span className="rounded bg-bg-secondary px-2 py-0.5 text-xs text-fg-secondary">
                        {order.delivery_method_display || order.delivery_method}
                      </span>
                    </div>
                    <div className="text-sm text-fg-secondary">{order.customer_name}</div>
                    <ul className="mt-2 space-y-0.5 text-sm text-fg-primary">
                      {order.items.map((it) => (
                        <li key={it.id}>{it.quantity}× {it.product_name}{it.notes ? ` — ${it.notes}` : ''}</li>
                      ))}
                    </ul>
                    {order.customer_notes && <div className="mt-1 text-xs text-fg-muted">Obs: {order.customer_notes}</div>}
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
        })
      )}
    </div>
  );
};
