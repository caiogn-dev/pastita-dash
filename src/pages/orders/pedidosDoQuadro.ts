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
 * Fuso da operação. "Entregue hoje" é o dia CIVIL da loja, não o do relógio da
 * máquina que roda o código: o painel é operado no Brasil, mas o navegador pode
 * estar em outro fuso (ou o build/SSR rodar em UTC). Comparar pelo fuso local
 * fazia um pedido entregue às 21h de ontem (que já é 00h de hoje em UTC) cair na
 * coluna de finalizados de hoje. Default alinhado ao restante do painel
 * (ScheduledMessagesPage) e ao campo `timezone` da loja.
 */
export const FUSO_DA_LOJA = 'America/Sao_Paulo';

interface PedidoDoQuadro {
  id: string;
  status: string;
  created_at: string;
}

interface ColunaDoQuadro {
  id: string;
  statuses: readonly string[];
}

/** Data-calendário (YYYY-MM-DD) de `data` no fuso informado. */
const diaCivil = (data: Date, fuso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);

const mesmoDia = (a: Date, b: Date, fuso: string) =>
  diaCivil(a, fuso) === diaCivil(b, fuso);

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  fuso: string = FUSO_DA_LOJA,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDia(new Date(o.created_at), agora, fuso))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
