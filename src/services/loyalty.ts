import api from './api';

export interface LoyaltyAccountRow {
  user_id: string;
  display_name: string;
  email: string;
  qualified_count: number;
  redeemed_count: number;
  progress: number;
  available_rewards: number;
  /** Itens que faltam para fechar o cartão atual. Vem do backend para o
   *  frontend não refazer a conta com um threshold que pode divergir. */
  falta: number;
  updated_at: string;
}

/** Agregado do banco inteiro — nunca somar as linhas da página para obter isto. */
export interface LoyaltyResumo {
  participantes: number;
  brindes_ganhos: number;
  brindes_disponiveis: number;
  brindes_resgatados: number;
  /** Clientes a exatamente 1 item de ganhar. O gatilho acionável. */
  quase_la: number;
}

export interface LoyaltyAccountsResponse {
  count: number;
  results: LoyaltyAccountRow[];
  resumo?: LoyaltyResumo;
}

class LoyaltyService {
  async getAccounts(
    storeSlug: string,
    page = 1,
    comResumo = false,
  ): Promise<LoyaltyAccountsResponse> {
    const { data } = await api.get(`/stores/${storeSlug}/loyalty/accounts/`, {
      // O resumo só vem na primeira página: ele é do banco inteiro, então
      // pedi-lo a cada rolagem seria a mesma conta repetida.
      params: { page, ...(comResumo ? { resumo: 1 } : {}) },
    });
    return data;
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
