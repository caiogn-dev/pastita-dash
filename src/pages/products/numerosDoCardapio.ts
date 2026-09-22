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
