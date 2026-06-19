import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BottomSheet } from './ui/BottomSheet';
import { formatCurrency } from '../utils/formatters';
import { updateOrderStatus } from '../services/storesApi';
import { nextOrderStatus, STATUS_LABEL } from './mobileStatus';
import type { StoreOrder } from '../services/storesApi';

interface Props {
  order: StoreOrder | null;
  onClose: () => void;
  onAdvanced?: () => void;
}

export const MobileOrderDetailSheet: React.FC<Props> = ({ order, onClose, onAdvanced }) => {
  const [busy, setBusy] = useState(false);
  if (!order) return null;

  const next = nextOrderStatus(order.status);

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, next.status);
      onAdvanced?.();
      onClose();
    } catch {
      toast.error('Erro ao atualizar o pedido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title={`Pedido ${order.order_number}`}>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <div className="font-semibold text-fg-primary">{order.customer_name}</div>
          <div className="text-fg-muted">{order.customer_phone}</div>
        </div>
        <div className="text-fg-secondary">
          {order.delivery_method_display || order.delivery_method}
          <span className="ml-1 text-fg-muted">· {STATUS_LABEL[order.status] ?? order.status}</span>
        </div>
        <ul className="divide-y divide-border-primary rounded-lg border border-border-primary">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between px-3 py-2">
              <span className="text-fg-primary">{it.quantity}× {it.product_name}</span>
              <span className="text-fg-secondary">{formatCurrency(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        {order.customer_notes && (
          <div className="rounded-lg bg-bg-secondary p-2 text-fg-secondary">Obs: {order.customer_notes}</div>
        )}
        <div className="flex justify-between border-t border-border-primary pt-2 text-base font-semibold text-fg-primary">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={advance}
            className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {next.label}
          </button>
        )}
      </div>
    </BottomSheet>
  );
};
