/**
 * Ajudas do cadastro (do admin do Prefiro): descrição melhorada pela IA e
 * combos sugeridos pelo que os clientes já compram juntos. A conta e o prompt
 * moram no servidor — aqui só o transporte. Nada é gravado por estas rotas.
 */
import api from './api';
import type { StoreCombo } from './storesApi';

export interface DescricaoSugerida {
  descricao: string;
  descricao_curta: string;
}

export interface SugestaoDeCombo {
  produtos: { id: string; nome: string; preco: number }[];
  pedidos_juntos: number;
  preco_somado: number;
  preco_sugerido: number;
}

export const ajudasDoCadastro = {
  melhorarDescricao: async (
    slug: string,
    dados: { nome: string; descricao?: string; categoria?: string },
  ): Promise<DescricaoSugerida> => (await api.post(`/stores/${slug}/produtos/melhorar-descricao/`, dados)).data,
  sugestoesDeCombos: async (slug: string): Promise<SugestaoDeCombo[]> =>
    (await api.get(`/stores/${slug}/sugestao-de-combos/`)).data.sugestoes ?? [],
};

/** Ponto de partida do formulário de combo: um grupo de uma opção só por produto. */
export function comboDaSugestao(s: SugestaoDeCombo): Partial<StoreCombo> {
  return {
    name: s.produtos.map((p) => p.nome).join(' + '),
    description: '',
    price: s.preco_sugerido,
    compare_at_price: s.preco_somado,
    is_active: true,
    featured: false,
    groups: s.produtos.map((p, i) => ({
      id: `sugestao-${i}`,
      product_id: null,
      product_name: p.nome,
      title: p.nome,
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      allow_duplicate_variants: false,
      position: i,
      variant_limits: [],
      product_options: [{ product_id: p.id, name: p.nome, price: p.preco, max_selections: 1 }],
    })),
  };
}
