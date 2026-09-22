/**
 * As avaliações da loja, uma a uma.
 *
 * O resumo (média, distribuição, pilares) já vem de `reports/reviews` e
 * alimenta a home. O que faltava era LER cada avaliação: quem falou, sobre
 * qual pedido, e o que escreveu.
 */
import api, { normalizePaginatedResponse } from './api';

export interface Avaliacao {
  id: string;
  order: string | null;
  order_number: string | null;
  rating: number;
  comment: string;
  rating_comida: number | null;
  rating_entrega: number | null;
  rating_atendimento: number | null;
  customer_name: string;
  created_at: string;
  items?: { product_name?: string; product?: string; rating: number }[];
}

export const avaliacoesService = {
  listar: async (storeSlug: string, nota?: number): Promise<Avaliacao[]> => {
    const response = await api.get(`/stores/${storeSlug}/reviews/`, {
      params: nota ? { rating: nota } : undefined,
    });
    return normalizePaginatedResponse<Avaliacao>(response.data);
  },
};

export default avaliacoesService;
