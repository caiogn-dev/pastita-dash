/**
 * Entregadores da loja, quem levou cada pedido e o ranking da operação
 * (do admin do Prefiro). A conta mora no servidor
 * (`stores/services/ranking_da_operacao.py`) — aqui só o transporte.
 */
import api from './api';

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  is_active: boolean;
}

export interface RankingDaOperacao {
  dias: number;
  entregadores: { id: string; nome: string; entregas: number; frete: number; minutos_medios: number | null }[];
  /** Entregas do período sem ninguém atribuído — o ranking não as enxerga. */
  sem_entregador: number;
  atendentes: { id: number; nome: string; pedidos: number; faturado: number }[];
}

export const operacaoService = {
  ranking: async (slug: string, dias = 30): Promise<RankingDaOperacao> =>
    (await api.get(`/stores/${slug}/ranking/`, { params: { dias } })).data,
  entregadores: async (slug: string): Promise<Entregador[]> =>
    (await api.get(`/stores/${slug}/entregadores/`)).data,
  criarEntregador: async (slug: string, dados: { nome: string; telefone?: string }): Promise<Entregador> =>
    (await api.post(`/stores/${slug}/entregadores/`, dados)).data,
  mudarEntregador: async (slug: string, id: string, dados: Partial<Entregador>): Promise<Entregador> =>
    (await api.patch(`/stores/${slug}/entregadores/${id}/`, dados)).data,
  atribuir: async (slug: string, pedidoId: string, entregador: string | null): Promise<{ entregador: string | null; entregador_nome: string | null }> =>
    (await api.post(`/stores/${slug}/pedidos/${pedidoId}/entregador/`, { entregador })).data,
  /** Cliente, endereço, CEP, mapa e o que cobrar — montado no servidor. */
  mensagem: async (slug: string, pedidoId: string): Promise<{ texto: string; whatsapp: string }> =>
    (await api.get(`/stores/${slug}/pedidos/${pedidoId}/entregador/`)).data,
  /** Manda pelo WhatsApp da loja (API). 409 = sem janela de 24 h, sem telefone… (motivo em `detail`). */
  enviar: async (slug: string, pedidoId: string): Promise<{ enviado: boolean; para: string }> =>
    (await api.post(`/stores/${slug}/pedidos/${pedidoId}/entregador/enviar/`)).data,
};
