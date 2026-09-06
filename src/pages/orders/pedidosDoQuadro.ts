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

interface PedidoDoQuadro {
  id: string;
  status: string;
  created_at: string;
}

interface ColunaDoQuadro {
  id: string;
  statuses: readonly string[];
}

/**
 * O dia comercial do Cardapidex é o dia do Brasil, não o fuso de quem abre o
 * painel. Comparar `getDate()` usava o fuso do runtime: num servidor/CI em UTC
 * um pedido das 21h de ontem no Brasil (= 00h de hoje em UTC) entrava como
 * "entregue hoje". Fixamos o corte em America/Sao_Paulo para o resultado ser
 * estável onde quer que o código rode.
 */
const FUSO_BRASIL = 'America/Sao_Paulo';

const formatadorDiaBrasil = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BRASIL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const diaNoBrasil = (d: Date) => formatadorDiaBrasil.format(d);

const mesmoDia = (a: Date, b: Date) => diaNoBrasil(a) === diaNoBrasil(b);

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDia(new Date(o.created_at), agora))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
