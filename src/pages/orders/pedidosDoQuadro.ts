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

// O "dia" do quadro é o de Brasília, não o fuso de quem abre o painel. O
// backend manda `created_at` com offset; ler o dia pelo fuso do navegador
// (ou do CI em UTC) empurra o pedido entregue das 21h em diante para o dia
// SEGUINTE — some do "Entregue" no meio do pico do delivery. Ancorar em
// America/Sao_Paulo mantém o corte estável seja onde for que o painel abra.
const FUSO_DO_NEGOCIO = 'America/Sao_Paulo';

const diaDoNegocio = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_DO_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const mesmoDia = (a: Date, b: Date) =>
  diaDoNegocio.format(a) === diaDoNegocio.format(b);

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
