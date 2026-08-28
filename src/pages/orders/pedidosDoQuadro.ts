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

/** A única coluna que representa trabalho encerrado. */
export const ENTREGUES_DE_HOJE = 'done';

/**
 * O dia do balcão, não o do servidor. A Vercel roda em UTC: às 21h no Brasil
 * já é o dia seguinte em UTC, e um `getDate()` cru moveria o pedido de dia
 * sozinho — sumindo ou reaparecendo na coluna de finalizados. O corte é sempre
 * America/Sao_Paulo.
 */
export const FUSO_DA_OPERACAO = 'America/Sao_Paulo';

interface PedidoDoQuadro {
  id: string;
  status: string;
  created_at: string;
}

interface ColunaDoQuadro {
  id: string;
  statuses: readonly string[];
}

/** "2026-08-27" no fuso da operação — estável para comparar por igualdade. */
const diaDaOperacao = (data: Date, fuso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);

const mesmoDia = (a: Date, b: Date, fuso: string) =>
  diaDaOperacao(a, fuso) === diaDaOperacao(b, fuso);

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  fuso: string = FUSO_DA_OPERACAO,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDia(new Date(o.created_at), agora, fuso))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
