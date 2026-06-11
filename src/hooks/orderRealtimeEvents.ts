import type { StoreOrder } from '../services/storesApi';

export interface OrderRealtimeEvent {
  type?: string;
  order_id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  total?: string | number;
  updated_at?: string;
  paid_at?: string;
  cancelled_at?: string;
  customer_name?: string;
  [key: string]: unknown;
}

/**
 * Aplica um evento realtime de pedido na lista atual, sem refetch.
 * Retorna a nova lista, ou null quando o patch não é possível
 * (pedido desconhecido / sem order_id) — nesse caso o caller deve refetch.
 * Eventos com updated_at mais antigo que o estado atual são ignorados
 * (proteção contra entrega fora de ordem).
 */
export function applyOrderEventToOrders(
  orders: StoreOrder[],
  event: OrderRealtimeEvent
): StoreOrder[] | null {
  if (!event.order_id) return null;
  const idx = orders.findIndex((o) => o.id === event.order_id);
  if (idx === -1) return null;

  const current = orders[idx];
  if (
    event.updated_at &&
    current.updated_at &&
    new Date(event.updated_at).getTime() < new Date(current.updated_at).getTime()
  ) {
    return orders.slice();
  }

  const patch: Partial<StoreOrder> = {};
  if (event.status) patch.status = event.status;
  if (event.payment_status) patch.payment_status = event.payment_status;
  if (event.total !== undefined && event.total !== null) patch.total = Number(event.total);
  if (event.updated_at) patch.updated_at = event.updated_at;
  if (event.customer_name) patch.customer_name = event.customer_name;

  return orders.map((o, i) => (i === idx ? { ...o, ...patch } : o));
}
