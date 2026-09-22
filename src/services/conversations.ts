import api, { normalizePaginatedEnvelope } from './api';
import { Conversation, ConversationNote, PaginatedResponse, Message, UniversalConversation } from '../types';

/** Um cliente na fila humana — montado no backend a partir da conversa. */
export interface ItemDaFilaHumana {
  id: string;
  telefone: string;
  nome: string;
  /** "Respondido pelo WhatsApp do celular", "A IA não conseguiu responder"… */
  motivo: string;
  humano_desde: string | null;
  cliente_escreveu_em: string | null;
  /** 0 quando ninguém está esperando (atendimento em andamento). */
  minutos_esperando: number;
  ultima_mensagem: string;
}

export interface FilaHumana {
  /** Cliente escreveu depois da nossa última resposta — mais antigo primeiro. */
  esperando: ItemDaFilaHumana[];
  /** Alguém atendeu hoje e não há mensagem pendente do cliente. */
  em_atendimento: ItemDaFilaHumana[];
  total_esperando: number;
  total_em_atendimento: number;
}

/** Um aviso que a loja mandou sozinha (status, lembrete, avaliação…). */
export interface AvisoAutomatico {
  id: string;
  quando: string;
  tipo: string;
  /** "Status do pedido", "Lembrete de PIX"… */
  rotulo: string;
  cliente: string;
  telefone: string;
  texto: string;
  /** sent · delivered · read · failed · pending */
  status: string;
  /** Motivo da falha em português; vazio quando chegou. */
  erro: string;
  /** Código e texto da Meta, para suporte. */
  erro_tecnico: string;
  conversa_id: string | null;
}

export interface ResumoDeAvisos {
  tipo: string;
  rotulo: string;
  total: number;
  falharam: number;
}

export interface AvisosAutomaticos {
  dias: number;
  resumo: ResumoDeAvisos[];
  itens: AvisoAutomatico[];
}

export const conversationsService = {
  /** O que a loja mandou sozinha no período, com resumo por tipo. */
  getMensagensAutomaticas: async (
    params: { store?: string; dias: number; tipo?: string },
  ): Promise<AvisosAutomaticos> => {
    const response = await api.get<AvisosAutomaticos>('/conversations/mensagens-automaticas/', { params });
    return response.data;
  },

  /** Fila humana da loja: quem espera uma pessoa responder. */
  getFilaHumana: async (store?: string): Promise<FilaHumana> => {
    const response = await api.get<FilaHumana>('/conversations/fila-humana/', {
      params: store ? { store } : undefined,
    });
    return response.data;
  },

  getConversations: async (
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<Conversation>> => {
    const response = await api.get<PaginatedResponse<Conversation> | Conversation[]>('/conversations/', { params, signal });
    return normalizePaginatedEnvelope<Conversation>(response.data);
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const response = await api.get<Conversation>(`/conversations/${id}/`);
    return response.data;
  },

  getMessages: async (
    conversationId: string,
    pageSize = 100,
    beforeId?: string
  ): Promise<{ results: Message[]; has_more: boolean; next_before_id: string | null }> => {
    const response = await api.get<{ results: Message[]; has_more?: boolean; next_before_id?: string | null }>(
      `/conversations/${conversationId}/messages/`,
      { params: { limit: pageSize, before_id: beforeId } }
    );
    return {
      results: response.data.results ?? [],
      has_more: Boolean(response.data.has_more),
      next_before_id: response.data.next_before_id ?? null,
    };
  },

  switchToHuman: async (id: string, agentId?: number): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/switch_to_human/`, {
      agent_id: agentId,
    });
    return response.data;
  },

  switchToAuto: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/switch_to_auto/`);
    return response.data;
  },

  assignAgent: async (id: string, agentId: number): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/assign_agent/`, {
      agent_id: agentId,
    });
    return response.data;
  },

  unassignAgent: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/unassign_agent/`);
    return response.data;
  },

  closeConversation: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/close/`);
    return response.data;
  },

  resolveConversation: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/resolve/`);
    return response.data;
  },

  reopenConversation: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/reopen/`);
    return response.data;
  },

  getNotes: async (id: string): Promise<ConversationNote[]> => {
    const response = await api.get<ConversationNote[]>(`/conversations/${id}/notes/`);
    return response.data;
  },

  addNote: async (id: string, content: string): Promise<ConversationNote> => {
    const response = await api.post<ConversationNote>(`/conversations/${id}/add_note/`, { content });
    return response.data;
  },

  updateContext: async (id: string, context: Record<string, unknown>): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/update_context/`, { context });
    return response.data;
  },

  addTag: async (id: string, tag: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/add_tag/`, { tag });
    return response.data;
  },

  removeTag: async (id: string, tag: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/remove_tag/`, { tag });
    return response.data;
  },

  getStats: async (accountId: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/conversations/stats/', { params: { account_id: accountId } });
    return response.data;
  },

  markAsRead: async (id: string): Promise<Conversation> => {
    const response = await api.post<Conversation>(`/conversations/${id}/mark_as_read/`);
    return response.data;
  },

  getUniversalConversations: async (): Promise<PaginatedResponse<UniversalConversation>> => {
    const response = await api.get<PaginatedResponse<UniversalConversation> | UniversalConversation[]>('/conversations/universal/');
    return normalizePaginatedEnvelope<UniversalConversation>(response.data);
  },
};
