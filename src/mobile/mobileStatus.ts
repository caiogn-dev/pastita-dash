/** pt-BR labels for order statuses shown on mobile. */
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

import { proximaAcaoDoPedido } from '../pages/orders/proximaAcao';
import type { Order } from '../types';

/**
 * Próximo passo do pedido no celular — a MESMA regra do desktop.
 *
 * Isto era uma tabela `status → próximo` própria, que ignorava o
 * `delivery_method`. Cada mudança de status dispara mensagem no WhatsApp do
 * cliente, então a divergência mandava texto errado para os dois lados:
 * entrega parava em `ready` ("pronto para retirada") e retirada seguia para
 * `out_for_delivery` ("saiu para entrega"). É o pedido CE-2608129257 (Diana,
 * 12/ago) outra vez — o kanban e a página já tinham sido unificados em
 * `proximaAcao.ts`; esta era a cópia que sobrou.
 *
 * Recebe o PEDIDO, não o status: era a assinatura antiga que tornava o erro
 * possível — sem o `delivery_method` não há como ramificar.
 */
export function nextOrderStatus(
  // Assinatura frouxa de propósito: o mobile fala `StoreOrder` (status como
  // `string`) e a regra fala `Order` (status como união). Este adaptador é a
  // fronteira entre os dois mundos — apertar aqui só empurraria o cast para
  // as três telas que chamam.
  order: { status: string; delivery_method?: string | null } | null | undefined,
): { status: string; label: string } | null {
  if (!order) return null;
  const acao = proximaAcaoDoPedido(order as Order);
  return acao ? { status: acao.status, label: acao.rotulo } : null;
}
