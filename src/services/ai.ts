/**
 * IA do painel — resumo diário + insights de conversas.
 *
 * Backend (apps/stores):
 * - GET /stores/ai/daily-summary/?store=<slug|id>[&refresh=1]
 * - GET /stores/ai/conversation-insights/?store=<slug|id>[&days=N][&refresh=1]
 *
 * O baseURL do axios já inclui /api/v1 — os paths aqui NÃO repetem o prefixo.
 */
import api from './api';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AiDailySummaryTopProduct {
  name: string;
  qty: number;
  total: number;
}

export interface AiDailySummaryStats {
  date: string;
  orders: number;
  revenue: number;
  avg_ticket: number;
  orders_prev_day: number;
  revenue_prev_day: number;
  top_products: AiDailySummaryTopProduct[];
  peak_hour: number | null;
  cancelled: number;
}

export interface AiDailySummary {
  stats: AiDailySummaryStats;
  summary: string;
  source: 'llm' | 'template';
  cached: boolean;
}

export interface ConversationInsightsData {
  faqs: string[];
  complaints: string[];
  opportunities: string[];
  sentiment: string;
  summary: string;
}

export interface ConversationInsights {
  days: number;
  message_count: number;
  insights: ConversationInsightsData | null;
  summary: string;
  source: 'llm' | 'none' | 'error';
  cached: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Resumo IA do dia anterior da loja (vendas, pico, top produtos).
   * `refresh=true` força regeneração no backend (ignora cache).
   */
  getDailySummary: async (store: string, refresh?: boolean): Promise<AiDailySummary> => {
    const params: Record<string, string | number> = { store };
    if (refresh) params.refresh = 1;
    const response = await api.get<AiDailySummary>('/stores/ai/daily-summary/', { params });
    return response.data;
  },

  /**
   * Insights de conversas WhatsApp (FAQs, reclamações, oportunidades, sentimento).
   * `days` limita o período analisado; `refresh=true` força regeneração.
   */
  getConversationInsights: async (
    store: string,
    days?: number,
    refresh?: boolean,
  ): Promise<ConversationInsights> => {
    const params: Record<string, string | number> = { store };
    if (typeof days === 'number') params.days = days;
    if (refresh) params.refresh = 1;
    const response = await api.get<ConversationInsights>('/stores/ai/conversation-insights/', { params });
    return response.data;
  },
};

export default aiService;
