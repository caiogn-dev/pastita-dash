/** Pedido que entrou pelo app da 99Food. O número curto (order_index) é o que
 * o entregador e o app da 99 mostram, então é ele que vai no cartão. */
type PedidoComOrigem = { source?: string | null; metadata?: Record<string, unknown> | null };

type MetadataDa99 = {
  numero?: number | string | null;
  quem_entrega?: string;
  codigo_entrega?: string;
  codigo_retirada?: string;
  ultimo_erro?: string;
};

export type DadosDa99 = {
  numero: number | null;
  rotulo: string;
  quemEntrega: string;
  codigoEntrega: string;
  codigoRetirada: string;
  erro: string;
};

export function dadosDa99(pedido: PedidoComOrigem): DadosDa99 | null {
  if (pedido.source !== '99food') return null;
  const m = (pedido.metadata?.['99food'] ?? {}) as MetadataDa99;
  const n = Number(String(m.numero ?? '').replace('#', ''));
  const numero = Number.isFinite(n) && n > 0 ? n : null;
  return {
    numero,
    rotulo: numero ? `99 #${numero}` : '99Food',
    quemEntrega: m.quem_entrega ?? '',
    codigoEntrega: m.codigo_entrega ?? '',
    codigoRetirada: m.codigo_retirada ?? '',
    erro: m.ultimo_erro ?? '',
  };
}

export function seloDa99(pedido: PedidoComOrigem): string | null {
  return dadosDa99(pedido)?.rotulo ?? null;
}
