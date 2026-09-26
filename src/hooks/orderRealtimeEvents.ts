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
  /** 'carteira' = venda de saldo pré-pago, não pedido de comida. */
  source?: string;
  credito_concedido?: string | number;
  [key: string]: unknown;
}

/** Venda de saldo: não entra no quadro, não toca bipe de pedido. */
export function ehCompraDeCarteira(event: OrderRealtimeEvent): boolean {
  return event.source === 'carteira';
}

/** "Flaviane pagou R$ 139,00 e ganhou R$ 152,00 de saldo" — para o toast. */
export function textoDaCompraDeCarteira(
  event: OrderRealtimeEvent,
  dinheiro: (v: number) => string,
): string {
  const nome = (event.customer_name || 'Cliente').trim();
  const pagou = Number(event.total ?? 0);
  const saldo = Number(event.credito_concedido ?? event.total ?? 0);
  return `💳 ${nome} comprou ${dinheiro(saldo)} de saldo (pagou ${dinheiro(pagou)}). Não é pedido.`;
}

/** Nome do evento de janela que avisa o quadro que houve compra de saldo. */
export const EVENTO_COMPRA_DE_CARTEIRA = 'cardapidex:compra-de-carteira';

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
  // Aviso de pagamento a menor traz o saldo — o card mostra sem refetch.
  if (event.amount_paid !== undefined && event.amount_paid !== null) patch.amount_paid = Number(event.amount_paid);
  if (event.amount_due !== undefined && event.amount_due !== null) patch.amount_due = Number(event.amount_due);

  return orders.map((o, i) => (i === idx ? { ...o, ...patch } : o));
}
