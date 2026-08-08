/**
 * Diagnóstico do cardápio.
 *
 * A lista de produtos responde "o que eu vendo". Não responde a pergunta que o
 * dono faz de verdade: **o que eu faço com o cardápio esta semana**. Item
 * pausado que ficou pausado, produto sem preço que nunca vai vender, estoque
 * no fim — tudo isso está na tela e nenhum salta aos olhos entre 203 linhas.
 *
 * Vale a mesma regra dos cupons: se não dá para dizer o que fazer, não vira
 * insight. Número a tabela já mostra.
 *
 * Calculado sobre a lista já carregada. Um endpoint novo para reprocessar o
 * que está na memória adicionaria latência e um segundo lugar onde a regra
 * pode divergir da tela.
 */
export interface ProdutoDoCardapio {
  id: string;
  name: string;
  price?: number | string | null;
  status?: string | null;
  is_active?: boolean;
  track_stock?: boolean;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  image?: string | null;
  image_url?: string | null;
}

export interface InsightDeCardapio {
  chave: string;
  direcao: 'alta' | 'baixa' | 'estavel';
  titulo: string;
  valor: string;
  recomendacao: string;
  /** Produto que o insight acusa, quando é um só. */
  produtoId?: string;
}

/** Acima disto a lista de pausados é escolha, não esquecimento. */
const PAUSADOS_QUE_INCOMODAM = 3;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function ativo(p: ProdutoDoCardapio): boolean {
  if (typeof p.is_active === 'boolean') return p.is_active;
  return (p.status ?? 'active') === 'active';
}

export function insightsDeCardapio(
  produtos: ProdutoDoCardapio[] | null | undefined
): InsightDeCardapio[] {
  if (!produtos?.length) return [];

  const insights: InsightDeCardapio[] = [];
  const ativos = produtos.filter(ativo);

  // 1. Sem estoque — é o que faz o cliente pedir e você cancelar depois.
  //    Vem primeiro porque a consequência é imediata e ruim.
  const semEstoque = ativos.filter(
    (p) => p.track_stock && num(p.stock_quantity) <= 0
  );
  if (semEstoque.length > 0) {
    insights.push({
      chave: 'sem_estoque',
      direcao: 'baixa',
      titulo: `${semEstoque.length} item${semEstoque.length > 1 ? 'ns' : ''} no cardápio sem estoque`,
      valor: semEstoque.slice(0, 3).map((p) => p.name).join(', ') + (semEstoque.length > 3 ? '…' : ''),
      recomendacao: 'reponha ou pause — o cliente pede e você cancela depois',
      produtoId: semEstoque.length === 1 ? semEstoque[0].id : undefined,
    });
  }

  // 2. Estoque no fim: ainda dá tempo de repor sem perder venda.
  const acabando = ativos.filter((p) => {
    if (!p.track_stock) return false;
    const q = num(p.stock_quantity);
    const minimo = num(p.low_stock_threshold);
    return q > 0 && minimo > 0 && q <= minimo;
  });
  if (acabando.length > 0) {
    insights.push({
      chave: 'estoque_baixo',
      direcao: 'baixa',
      titulo: `${acabando.length} item${acabando.length > 1 ? 'ns' : ''} com estoque no fim`,
      valor: acabando.slice(0, 3).map((p) => p.name).join(', ') + (acabando.length > 3 ? '…' : ''),
      recomendacao: 'reponha hoje para não perder a venda de amanhã',
      produtoId: acabando.length === 1 ? acabando[0].id : undefined,
    });
  }

  // 3. Preço zerado num item ATIVO. O cliente vê "R$ 0,00" na vitrine — ou
  //    pior, consegue fechar o pedido de graça.
  const semPreco = ativos.filter((p) => num(p.price) <= 0);
  if (semPreco.length > 0) {
    insights.push({
      chave: 'sem_preco',
      direcao: 'baixa',
      titulo: `${semPreco.length} item${semPreco.length > 1 ? 'ns' : ''} ativo${semPreco.length > 1 ? 's' : ''} sem preço`,
      valor: semPreco.slice(0, 3).map((p) => p.name).join(', ') + (semPreco.length > 3 ? '…' : ''),
      recomendacao: 'defina o preço — no cardápio isso aparece como R$ 0,00',
      produtoId: semPreco.length === 1 ? semPreco[0].id : undefined,
    });
  }

  // 4. Sem foto: a decisão de compra passa pela imagem, e um card vazio no
  //    meio de vinte com foto lê como item indisponível.
  const semFoto = ativos.filter((p) => !p.image && !p.image_url);
  if (semFoto.length > 0) {
    insights.push({
      chave: 'sem_foto',
      direcao: 'estavel',
      titulo: `${semFoto.length} item${semFoto.length > 1 ? 'ns' : ''} no cardápio sem foto`,
      valor: `${Math.round((semFoto.length / ativos.length) * 100)}% dos ativos`,
      recomendacao: 'item sem foto no meio de outros com foto parece indisponível',
      produtoId: semFoto.length === 1 ? semFoto[0].id : undefined,
    });
  }

  // 5. Muitos pausados. Poucos é curadoria; muitos é cardápio esquecido.
  const pausados = produtos.filter((p) => !ativo(p));
  if (pausados.length > PAUSADOS_QUE_INCOMODAM) {
    insights.push({
      chave: 'pausados',
      direcao: 'estavel',
      titulo: `${pausados.length} itens pausados no cadastro`,
      valor: `${Math.round((pausados.length / produtos.length) * 100)}% do cardápio`,
      recomendacao: 'reative os que voltaram ou remova o que não volta mais',
    });
  }

  return insights;
}

export default insightsDeCardapio;
