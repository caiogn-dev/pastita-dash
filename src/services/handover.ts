import api from './api';
import { Conversation } from '../types';

export interface HandoverStatus {
  handover_status: 'bot' | 'human' | 'pending';
  assigned_to?: string;
  assigned_to_name?: string;
  last_transfer_at?: string;
}

export interface HandoverResponse {
  success: boolean;
  handover_status: 'bot' | 'human' | 'pending';
  assigned_to?: string;
  assigned_to_name?: string;
  message?: string;
}

/**
 * Handover Protocol Service
 * 
 * Gerencia a transferência de conversas entre Bot e Atendimento Humano.
 * 
 * Fluxo:
 * 1. Conversa inicia no Bot (handover_status: 'bot')
 * 2. Se cliente pede ou bot não resolve, transferir para 'human'
 * 3. Operador humano atende e pode transferir de volta para 'bot'
 */
export const handoverService = {
  /**
   * Transferir conversa para o Bot
   */
  transferToBot: async (conversationId: string): Promise<HandoverResponse> => {
    const response = await api.post<HandoverResponse>(
      `/conversations/${conversationId}/handover/bot/`
    );
    return response.data;
  },

  /**
   * Transferir conversa para Atendimento Humano
   */
  transferToHuman: async (conversationId: string): Promise<HandoverResponse> => {
    const response = await api.post<HandoverResponse>(
      `/conversations/${conversationId}/handover/human/`
    );
    return response.data;
  },

  /**
   * Obter status atual do handover
   */
  getStatus: async (conversationId: string): Promise<HandoverStatus> => {
    const response = await api.get<HandoverStatus>(
      `/conversations/${conversationId}/handover/status/`
    );
    return response.data;
  },

  /**
   * Toggle entre Bot e Humano
   */
  toggle: async (
    conversationId: string, 
    currentStatus: 'bot' | 'human'
  ): Promise<HandoverResponse> => {
    if (currentStatus === 'bot') {
      return handoverService.transferToHuman(conversationId);
    } else {
      return handoverService.transferToBot(conversationId);
    }
  },
};

export default handoverService;
