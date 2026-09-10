/**
 * Quem entra em cada coluna do quadro de pedidos.
 *
 * O quadro chegou a ter 89 pedidos em "Entregue" e zero nas outras quatro:
 * um kanban de trabalho virou pilha de histórico com quatro colunas escritas
 * "Arraste aqui".
 *
 * A regra NÃO é limitar o quadro inteiro ao dia. Coluna de trabalho em aberto
 * precisa mostrar o pedido atrasado de ontem — esconder um pedido que ninguém
 * despachou seria perigoso. Só a coluna de finalizados é passado: ali fica o
 * de hoje, e o resto vive na página de Histórico.
 */

import { FUSO_BRASIL, mesmoDiaNoFuso } from '../../utils/fusoBrasil';

/** A única coluna que representa trabalho encerrado. */
export const ENTREGUES_DE_HOJE = 'done';

interface PedidoDoQuadro {
  id: string;
  status: string;
  created_at: string;
}

interface ColunaDoQuadro {
  id: string;
  statuses: readonly string[];
}

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  // "Hoje" é o dia da COZINHA, não o do navegador de quem abre o painel. Sem
  // fixar o fuso, um pedido entregue às 21h de ontem no Brasil (meia-noite em
  // UTC) escorregava para a coluna de finalizados de hoje em qualquer acesso
  // fora de -03:00. Quando a loja tiver `store.timezone` em mãos, passe-o aqui.
  fuso: string = FUSO_BRASIL,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDiaNoFuso(new Date(o.created_at), agora, fuso))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
