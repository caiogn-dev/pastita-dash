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

// O corte do dia é o da LOJA, não o do espectador. Ler
// getFullYear/getMonth/getDate usa o fuso local de quem roda o código: num
// navegador fora do fuso da loja — ou no CI, que roda em UTC — um pedido
// entregue às 21h de ontem (00h UTC de hoje) vazava para a coluna "Entregue".
// A loja multi-tenant tem seu próprio `timezone`; quando ele falta ou é
// inválido, caímos no fuso do Brasil (a base de lojas hoje).
const FUSO_PADRAO = 'America/Sao_Paulo';

const diaDaLoja = (d: Date, fuso: string): string => {
  try {
    return d.toLocaleDateString('en-CA', { timeZone: fuso });
  } catch {
    // timeZone inválido faz o Intl lançar RangeError — não deixa o quadro quebrar.
    return d.toLocaleDateString('en-CA', { timeZone: FUSO_PADRAO });
  }
};

const mesmoDia = (a: Date, b: Date, fuso: string) =>
  diaDaLoja(a, fuso) === diaDaLoja(b, fuso);

export function pedidosDaColuna<T extends PedidoDoQuadro>(
  pedidos: T[],
  coluna: ColunaDoQuadro,
  agora: Date = new Date(),
  fusoDaLoja?: string | null,
): T[] {
  const soDeHoje = coluna.id === ENTREGUES_DE_HOJE;
  const fuso = fusoDaLoja || FUSO_PADRAO;

  return pedidos
    .filter((o) => o.status !== 'cancelled')
    .filter((o) => coluna.statuses.includes(o.status))
    .filter((o) => !soDeHoje || mesmoDia(new Date(o.created_at), agora, fuso))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
