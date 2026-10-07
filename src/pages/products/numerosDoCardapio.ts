/**
 * Os quatro números do topo do Cardápio.
 *
 * Separados da tela porque contagem com regra ("sem estoque" só vale para
 * quem controla estoque) é exatamente o tipo de coisa que envelhece errado
 * dentro do JSX.
 */
export interface ProdutoContavel {
  status?: string;
  stock_quantity?: number | null;
  track_stock?: boolean;
}

export interface NumerosDoCardapio {
  cadastrados: number;
  ativos: number;
  pausados: number;
  semEstoque: number;
}

export function numerosDoCardapio(produtos: ProdutoContavel[]): NumerosDoCardapio {
  const ativos = produtos.filter((p) => p.status === 'active').length;
  return {
    cadastrados: produtos.length,
    ativos,
    pausados: produtos.length - ativos,
    // Produto que não controla estoque nunca está "sem estoque": ele é
    // ilimitado por decisão da loja, não por falta.
    semEstoque: produtos.filter(
      (p) => p.track_stock !== false && Number(p.stock_quantity ?? 0) <= 0,
    ).length,
  };
}

export type EstadoDoProduto = 'todos' | 'no_ar' | 'pausados' | 'sem_estoque';

/**
 * Os filtros rápidos do Cardápio (e os cards clicáveis) usam a MESMA régua
 * dos números do topo — um card que diz "2 sem estoque" e um filtro que
 * mostra 3 é o tipo de divergência que tira a confiança na tela.
 */
export function filtrarPorEstado<T extends ProdutoContavel>(produtos: T[], estado: EstadoDoProduto): T[] {
  switch (estado) {
    case 'no_ar':
      return produtos.filter((p) => p.status === 'active');
    case 'pausados':
      return produtos.filter((p) => p.status !== 'active');
    case 'sem_estoque':
      return produtos.filter((p) => p.track_stock !== false && Number(p.stock_quantity ?? 0) <= 0);
    default:
      return produtos;
  }
}
