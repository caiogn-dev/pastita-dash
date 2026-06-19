import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useMobileOrders } from '../MobileOrdersContext';
import { COLUMNS, statusToColumn } from '../../pages/orders/orderColumns';
import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { updateOrderStatus } from '../../services/storesApi';
import { SkeletonList } from '../ui/Skeleton';
import { PushOptInBanner } from '../PushOptInBanner';
import { MobileOrderDetailSheet } from '../MobileOrderDetailSheet';
import type { StoreOrder } from '../../services/storesApi';

const TERMINAL = new Set(['delivered', 'completed', 'cancelled', 'refunded', 'failed']);

export const MobileOrdersScreen: React.FC = () => {
  const { orders, loading, error, refetch } = useMobileOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreOrder | null>(null);

  const advance = async (order: StoreOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextOrderStatus(order.status);
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

  const Header = () => <h1 className="px-3 pt-3 text-lg font-bold text-fg-primary">Pedidos</h1>;

  if (loading && orders.length === 0) {
    return <div><Header /><SkeletonList count={5} /></div>;
  }
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-fg-secondary">{error}</p>
        <button type="button" onClick={refetch} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
          Tentar novamente
        </button>
      </div>
    );
  }

  const active = orders.filter((o) => !TERMINAL.has(o.status));

  return (
    <div className="pb-4">
      <Header />
      <PushOptInBanner />
      {active.length === 0 ? (
        <p className="p-6 text-center text-fg-muted">Nenhum pedido ativo no momento.</p>
      ) : (
        COLUMNS.map((col) => {
          const colOrders = active.filter((o) => statusToColumn(o.status) === col.id);
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
                    <li
                      key={order.id}
                      onClick={() => setDetail(order)}
                      className="rounded-xl border border-border-primary bg-bg-card p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg-primary">{order.order_number}</span>
                        <span className="text-sm text-fg-secondary">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fg-secondary">{order.customer_name}</span>
                        <span className="text-xs text-fg-muted">{formatRelativeTime(order.created_at)}</span>
                      </div>
                      <div className="mt-1 text-xs text-fg-muted">{STATUS_LABEL[order.status] ?? order.status}</div>
                      {next && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={(e) => advance(order, e)}
                          className="mt-3 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white disabled:opacity-60"
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
        })
      )}
      <MobileOrderDetailSheet order={detail} onClose={() => setDetail(null)} onAdvanced={refetch} />
    </div>
  );
};
