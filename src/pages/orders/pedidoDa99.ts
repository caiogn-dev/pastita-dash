/** Pedido que entrou pelo app da 99Food. O número curto (order_index) é o que
 * o entregador e o app da 99 mostram, então é ele que vai no cartão. */
type PedidoComOrigem = { source?: string | null; metadata?: Record<string, unknown> | null };

export function seloDa99(pedido: PedidoComOrigem): string | null {
  if (pedido.source !== '99food') return null;
  const dados = (pedido.metadata?.['99food'] ?? {}) as { numero?: number | string | null };
  return dados.numero ? `99 #${dados.numero}` : '99Food';
}
