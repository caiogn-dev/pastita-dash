/**
 * Expedição: o que acontece quando o código de barras da comanda é bipado.
 *
 * 🚨 NÃO existe tabela de status aqui. O próximo passo vem de
 * `proximaAcaoDoPedido` — já houve TRÊS cópias da máquina de estados no painel
 * e cada uma mandou WhatsApp errado (CE-2608129257: "pronto para retirada"
 * numa entrega). Este módulo só decide SE a bipagem pode avançar: a expedição
 * cuida da SAÍDA, então só vale o passo que leva a pronto, saiu ou entregue.
 */
import type { Order } from '../../types';
import { proximaAcaoDoPedido } from '../orders/proximaAcao';

/** Passos que a expedição executa. Confirmar e começar o preparo não são dela. */
const PASSOS_DE_SAIDA = new Set(['ready', 'out_for_delivery', 'delivered']);

/** O que o leitor USB digitou, pronto para comparar com `order_number`. */
export const codigoBipado = (bruto: string): string =>
  // Com a HRI ligada, a impressora imprime o seletor `{B` do Code128 e alguns
  // leitores devolvem junto.
  String(bruto ?? '').trim().replace(/^\{B/i, '').trim().toUpperCase();

/** A busca do backend é `icontains`: aqui só vale o número EXATO. */
export const pedidoDoCodigo = <T extends Pick<Order, 'order_number'>>(lista: T[], codigo: string): T | null =>
  lista.find((p) => String(p.order_number || '').toUpperCase() === codigo) ?? null;

export type AcaoDaBipagem =
  | { tipo: 'avancar'; status: string; rotulo: string }
  | { tipo: 'recusa'; motivo: string };

const MOTIVO_POR_STATUS: Record<string, string> = {
  pending: 'ainda não foi confirmado',
  processing: 'ainda não foi confirmado',
  confirmed: 'ainda não entrou em preparo',
  paid: 'ainda não entrou em preparo',
  delivered: 'já foi entregue',
  completed: 'já foi concluído',
  cancelled: 'está cancelado',
  refunded: 'foi estornado',
  failed: 'falhou no pagamento',
};

export const acaoDaBipagem = (pedido: Order): AcaoDaBipagem => {
  const acao = proximaAcaoDoPedido(pedido);
  if (acao && PASSOS_DE_SAIDA.has(acao.status)) {
    return { tipo: 'avancar', status: acao.status, rotulo: acao.rotulo };
  }
  const motivo = MOTIVO_POR_STATUS[pedido.status] ?? `está em "${pedido.status}"`;
  return { tipo: 'recusa', motivo: `Pedido ${motivo}.` };
};

/** Janela em que o mesmo código é o leitor repetindo, não uma nova saída. */
export const JANELA_DE_REPETICAO_MS = 3000;

/**
 * Leitor que lê duas vezes avançaria o pedido DOIS passos — saiu e entregue em
 * 1 segundo, com duas mensagens ao cliente. A segunda leitura é ignorada.
 */
export const ehBipagemRepetida = (
  ultima: { codigo: string; em: number } | null,
  codigo: string,
  agora: number,
): boolean => Boolean(ultima && ultima.codigo === codigo && agora - ultima.em < JANELA_DE_REPETICAO_MS);
