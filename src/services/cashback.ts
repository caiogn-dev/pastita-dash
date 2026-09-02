import api from './api';

/** Agregado do banco inteiro — nunca somar as linhas da página para obter isto. */
export interface CashbackResumo {
  /** Promessa: saldo vivo que a loja ainda vai pagar. */
  saldo_em_circulacao: string;
  /** Conta paga: crédito que já virou desconto. */
  ja_resgatado: string;
  clientes_com_saldo: number;
  saldo_de_indicacao: string;
  /** O único número com prazo — e por isso o único que manda agir hoje. */
  vence_em_7_dias: string;
}

export interface CashbackClienteRow {
  phone: string;
  saldo: string;
  vence_em: string;
  dias_para_vencer: number;
}

export interface CashbackResponse {
  enabled: boolean;
  percent: string;
  referral_percent: string;
  expiry_days: number;
  resumo: CashbackResumo;
  count: number;
  results: CashbackClienteRow[];
}

class CashbackService {
  async get(storeSlug: string, page = 1): Promise<CashbackResponse> {
    const { data } = await api.get(`/stores/${storeSlug}/cashback/`, { params: { page } });
    return data;
  }
}

export const cashbackService = new CashbackService();
