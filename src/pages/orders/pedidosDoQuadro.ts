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
 * Fuso padrão da loja. "Hoje" é o dia no balcão, não no relógio de quem abre o
 * painel: na Vercel/CI o runtime roda em UTC, e comparar o dia por
 * `Date#getDate()` (fuso do runtime) fazia um pedido das 21h de ontem em SP —
 * já 00h em UTC — voltar para a coluna de finalizados de "hoje".
 */
const FUSO_PADRAO = 'America/Sao_Paulo';

/** O dia civil (YYYY-MM-DD) de uma data no fuso indicado, estável em qualquer runtime. */
const diaCivil = (data: Date, fuso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  fusoDaLoja: string = FUSO_PADRAO,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;
  const hoje = diaCivil(agora, fusoDaLoja);

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || diaCivil(new Date(o.created_at), fusoDaLoja) === hoje)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
