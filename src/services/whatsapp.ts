import api from './api';
import {
  WhatsAppAccount,
  CreateWhatsAppAccount,
  Message,
  MessageTemplate,
  PaginatedResponse,
  SendTextMessage,
  SendTemplateMessage,
  SendInteractiveButtons,
  SendInteractiveList,
} from '../types';

export const whatsappService = {
  // Accounts
  getAccounts: async (): Promise<PaginatedResponse<WhatsAppAccount>> => {
    const response = await api.get<PaginatedResponse<WhatsAppAccount>>('/whatsapp/accounts/');
    return response.data;
  },

  getAccount: async (id: string): Promise<WhatsAppAccount> => {
    const response = await api.get<WhatsAppAccount>(`/whatsapp/accounts/${id}/`);
    return response.data;
  },

  createAccount: async (data: CreateWhatsAppAccount): Promise<WhatsAppAccount> => {
    const response = await api.post<WhatsAppAccount>('/whatsapp/accounts/', data);
    return response.data;
  },

  updateAccount: async (id: string, data: Partial<CreateWhatsAppAccount>): Promise<WhatsAppAccount> => {
    const response = await api.patch<WhatsAppAccount>(`/whatsapp/accounts/${id}/`, data);
    return response.data;
  },

  deleteAccount: async (id: string): Promise<void> => {
    await api.delete(`/whatsapp/accounts/${id}/`);
  },

  activateAccount: async (id: string): Promise<WhatsAppAccount> => {
    const response = await api.post<WhatsAppAccount>(`/whatsapp/accounts/${id}/activate/`);
    return response.data;
  },

  deactivateAccount: async (id: string): Promise<WhatsAppAccount> => {
    const response = await api.post<WhatsAppAccount>(`/whatsapp/accounts/${id}/deactivate/`);
    return response.data;
  },

  rotateToken: async (id: string, accessToken: string): Promise<{ message: string; token_version: number }> => {
    const response = await api.post(`/whatsapp/accounts/${id}/rotate_token/`, { access_token: accessToken });
    return response.data;
  },

  syncTemplates: async (id: string): Promise<{ message: string; count: number }> => {
    const response = await api.post(`/whatsapp/accounts/${id}/sync_templates/`);
    return response.data;
  },

  getBusinessProfile: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.get(`/whatsapp/accounts/${id}/business_profile/`);
    return response.data;
  },

  // Messages
  getMessages: async (params?: Record<string, string>): Promise<PaginatedResponse<Message>> => {
    const response = await api.get<PaginatedResponse<Message>>('/whatsapp/messages/', { params });
    return response.data;
  },

  getMessage: async (id: string): Promise<Message> => {
    const response = await api.get<Message>(`/whatsapp/messages/${id}/`);
    return response.data;
  },

  sendTextMessage: async (data: SendTextMessage): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_text/', data);
    return response.data;
  },

  sendTemplateMessage: async (data: SendTemplateMessage): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_template/', data);
    return response.data;
  },

  sendInteractiveButtons: async (data: SendInteractiveButtons): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_interactive_buttons/', data);
    return response.data;
  },

  sendInteractiveList: async (data: SendInteractiveList): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_interactive_list/', data);
    return response.data;
  },

  sendImage: async (data: {
    account_id: string;
    to: string;
    image_url?: string;
    image_id?: string;
    caption?: string;
    reply_to?: string;
  }): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_image/', data);
    return response.data;
  },

  sendDocument: async (data: {
    account_id: string;
    to: string;
    document_url?: string;
    document_id?: string;
    filename?: string;
    caption?: string;
    reply_to?: string;
  }): Promise<Message> => {
    const response = await api.post<Message>('/whatsapp/messages/send_document/', data);
    return response.data;
  },

  markAsRead: async (accountId: string, messageId: string): Promise<{ success: boolean }> => {
    const response = await api.post('/whatsapp/messages/mark_as_read/', {
      account_id: accountId,
      message_id: messageId,
    });
    return response.data;
  },

  getConversationHistory: async (
    accountId: string,
    phoneNumber: string,
    limit?: number
  ): Promise<Message[]> => {
    const response = await api.post<Message[]>('/whatsapp/messages/conversation_history/', {
      account_id: accountId,
      phone_number: phoneNumber,
      limit: limit || 50,
    });
    return response.data;
  },

  getMessageStats: async (
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> => {
    const response = await api.post('/whatsapp/messages/stats/', {
      account_id: accountId,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  // Templates
  getTemplates: async (params?: Record<string, string>): Promise<PaginatedResponse<MessageTemplate>> => {
    const response = await api.get<PaginatedResponse<MessageTemplate>>('/whatsapp/templates/', { params });
    return response.data;
  },

  getTemplate: async (id: string): Promise<MessageTemplate> => {
    const response = await api.get<MessageTemplate>(`/whatsapp/templates/${id}/`);
    return response.data;
  },
};
