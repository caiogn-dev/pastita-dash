import api from './api';

/** Quem está a um item de fechar o cartão — o gatilho de "Avisar". */
export interface ClienteAUmItem {
  id: string;
  nome: string;
  /** Mascarado pelo backend (`55*******1111`). */
  telefone: string;
  faltam: number;
}

/**
 * `GET /stores/<slug>/loyalty/impacto/` — últimos 90 dias.
 *
 * Número sem base vem `null`, nunca zero: zero diria "o brinde custa R$ 0",
 * nulo diz "sem dados ainda". "Por mês" é o total da janela ÷ 3.
 */
export interface LoyaltyImpacto {
  janela_dias: number;
  pedidos_pagos: number;
  ticket_medio: number | null;
  pedidos_por_mes: number;
  receita_paga_mes: number | null;
  amostra_suficiente: boolean;
  pedidos_faltando: number;
  participantes: number;
  /** Fração 0–1: clientes com 2+ pedidos pagos ÷ clientes com 1+. */
  taxa_recompra_participantes: number | null;
  taxa_recompra_nao_participantes: number | null;
  itens_para_ganhar: number;
  /** Ritmo de carimbos; o painel divide pelos itens DIGITADOS para simular. */
  carimbos_por_mes: number;
  brindes_por_mes_projetados: number;
  custo_por_brinde: number | null;
  /** `resgates` = média dos brindes que já viraram desconto; senão ticket médio. */
  custo_por_brinde_origem: 'resgates' | 'ticket_medio' | null;
  custo_projetado_mes: number | null;
  cashback_percentual: number;
  saldo_gerado_mes: number | null;
  a_um_item_total: number;
  a_um_item: ClienteAUmItem[];
}

class LoyaltyImpactoService {
  /**
   * Devolve `null` quando o backend ainda não tem o endpoint (404): o painel
   * sobe antes do servidor, e a tela precisa dizer "sem dados ainda" em vez
   * de quebrar ou mostrar zero.
   */
  async get(storeSlug: string): Promise<LoyaltyImpacto | null> {
    try {
      const { data } = await api.get(`/stores/${storeSlug}/loyalty/impacto/`);
      return data;
    } catch (e) {
      if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
      throw e;
    }
  }
}

export const loyaltyImpactoService = new LoyaltyImpactoService();
export default loyaltyImpactoService;
