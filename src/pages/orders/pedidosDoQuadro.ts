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
 * "Hoje" é o dia da LOJA, não o do relógio de quem abre o painel. Comparar por
 * `getFullYear/getMonth/getDate` usa o fuso local do ambiente (navegador ou
 * servidor); um operador em UTC — ou o CI — classificaria a coluna "Entregue
 * hoje" errado perto da meia-noite. Fixamos o horário de Brasília e comparamos
 * a data já formatada nesse fuso (`en-CA` dá `AAAA-MM-DD` estável).
 */
const FUSO_DA_LOJA = 'America/Sao_Paulo';

const formatoDoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_DA_LOJA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const diaDaLoja = (d: Date) => formatoDoDia.format(d);

const mesmoDia = (a: Date, b: Date) => diaDaLoja(a) === diaDaLoja(b);

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
