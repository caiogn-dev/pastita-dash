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

// O "dia" do quadro é o da LOJA, não o fuso de quem abre o painel. O backend
// manda `created_at` com offset; ler o dia pelo fuso do navegador (ou do CI em
// UTC) empurra o pedido entregue das 21h em diante para o dia SEGUINTE — some
// do "Entregue" no meio do pico do delivery. Cada loja tem seu `timezone`
// (multi-tenant: uma em São Paulo, outra em Manaus com -04); usar um fuso fixo
// esconderia os pedidos de hoje da loja que não está em Brasília. Só quando a
// loja não informa fuso caímos no de Brasília.
const FUSO_PADRAO = 'America/Sao_Paulo';

// `Intl.DateTimeFormat` é caro; memoiza um por fuso. Fuso inválido (dado ruim
// do backend) faria o construtor lançar RangeError — cai no padrão e memoiza
// o fallback sob a chave ruim para não repetir o try/catch a cada pedido.
const formatadoresPorFuso = new Map<string, Intl.DateTimeFormat>();

function formatadorDoDia(fuso?: string | null): Intl.DateTimeFormat {
  const chave = fuso || FUSO_PADRAO;
  const emCache = formatadoresPorFuso.get(chave);
  if (emCache) return emCache;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: chave,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatadoresPorFuso.set(chave, fmt);
    return fmt;
  } catch {
    const padrao = formatadorDoDia(FUSO_PADRAO);
    formatadoresPorFuso.set(chave, padrao);
    return padrao;
  }
}

const mesmoDia = (a: Date, b: Date, fuso?: string | null) => {
  const fmt = formatadorDoDia(fuso);
  return fmt.format(a) === fmt.format(b);
};

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  fusoDaLoja?: string | null,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDia(new Date(o.created_at), agora, fusoDaLoja))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
