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

  // ==================== CAMPAIGNS ====================
  
  campaigns: {
    list: async (params?: Record<string, string>): Promise<PaginatedResponse<WhatsAppCampaign>> => {
      const response = await api.get<PaginatedResponse<WhatsAppCampaign>>('/campaigns/', { params });
      return response.data;
    },

    get: async (id: string): Promise<WhatsAppCampaign> => {
      const response = await api.get<WhatsAppCampaign>(`/campaigns/${id}/`);
      return response.data;
    },

    create: async (data: CreateWhatsAppCampaign): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>('/campaigns/', data);
      return response.data;
    },

    update: async (id: string, data: Partial<CreateWhatsAppCampaign>): Promise<WhatsAppCampaign> => {
      const response = await api.patch<WhatsAppCampaign>(`/campaigns/${id}/`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/campaigns/${id}/`);
    },

    schedule: async (id: string, scheduledAt: string): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>(`/campaigns/${id}/schedule/`, { scheduled_at: scheduledAt });
      return response.data;
    },

    start: async (id: string): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>(`/campaigns/${id}/start/`);
      return response.data;
    },

    pause: async (id: string): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>(`/campaigns/${id}/pause/`);
      return response.data;
    },

    resume: async (id: string): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>(`/campaigns/${id}/resume/`);
      return response.data;
    },

    cancel: async (id: string): Promise<WhatsAppCampaign> => {
      const response = await api.post<WhatsAppCampaign>(`/campaigns/${id}/cancel/`);
      return response.data;
    },

    getStats: async (id: string): Promise<CampaignStats> => {
      const response = await api.get<CampaignStats>(`/campaigns/${id}/stats/`);
      return response.data;
    },

    getRecipients: async (id: string, status?: string): Promise<CampaignRecipient[]> => {
      const params = status ? { status } : {};
      const response = await api.get<CampaignRecipient[]>(`/campaigns/${id}/recipients/`, { params });
      return response.data;
    },

    addRecipients: async (id: string, contacts: ContactInput[]): Promise<{ added: number }> => {
      const response = await api.post<{ added: number }>(`/campaigns/${id}/add_recipients/`, { contacts });
      return response.data;
    },
  },

  // ==================== SCHEDULED MESSAGES ====================
  
  scheduledMessages: {
    list: async (params?: Record<string, string>): Promise<PaginatedResponse<ScheduledMessage>> => {
      const response = await api.get<PaginatedResponse<ScheduledMessage>>('/campaigns/scheduled/', { params });
      return response.data;
    },

    get: async (id: string): Promise<ScheduledMessage> => {
      const response = await api.get<ScheduledMessage>(`/campaigns/scheduled/${id}/`);
      return response.data;
    },

    create: async (data: CreateScheduledMessage): Promise<ScheduledMessage> => {
      const response = await api.post<ScheduledMessage>('/campaigns/scheduled/', data);
      return response.data;
    },

    update: async (id: string, data: Partial<CreateScheduledMessage>): Promise<ScheduledMessage> => {
      const response = await api.patch<ScheduledMessage>(`/campaigns/scheduled/${id}/`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/campaigns/scheduled/${id}/`);
    },

    cancel: async (id: string): Promise<ScheduledMessage> => {
      const response = await api.post<ScheduledMessage>(`/campaigns/scheduled/${id}/cancel/`);
      return response.data;
    },

    getStats: async (accountId?: string): Promise<ScheduledMessageStats> => {
      const params = accountId ? { account_id: accountId } : {};
      const response = await api.get<ScheduledMessageStats>('/campaigns/scheduled/stats/', { params });
      return response.data;
    },
  },

  // ==================== CONTACT LISTS ====================
  
  contactLists: {
    list: async (params?: Record<string, string>): Promise<PaginatedResponse<ContactList>> => {
      const response = await api.get<PaginatedResponse<ContactList>>('/campaigns/contact-lists/', { params });
      return response.data;
    },

    get: async (id: string): Promise<ContactList> => {
      const response = await api.get<ContactList>(`/campaigns/contact-lists/${id}/`);
      return response.data;
    },

    create: async (data: CreateContactList): Promise<ContactList> => {
      const response = await api.post<ContactList>('/campaigns/contact-lists/', data);
      return response.data;
    },

    update: async (id: string, data: Partial<CreateContactList>): Promise<ContactList> => {
      const response = await api.patch<ContactList>(`/campaigns/contact-lists/${id}/`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/campaigns/contact-lists/${id}/`);
    },

    importCsv: async (accountId: string, name: string, csvContent: string): Promise<ContactList> => {
      const response = await api.post<ContactList>('/campaigns/contact-lists/import_csv/', {
        account_id: accountId,
        name,
        csv_content: csvContent,
      });
      return response.data;
    },
  },
};

// ==================== TYPES ====================

export interface WhatsAppCampaign {
  id: string;
  account: string;
  name: string;
  description: string;
  campaign_type: 'broadcast' | 'drip' | 'triggered' | 'promotional' | 'transactional';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  template?: string;
  message_content: Record<string, unknown>;
  audience_type: string;
  audience_filters: Record<string, unknown>;
  contact_list: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  messages_per_minute: number;
  delay_between_messages: number;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  delivery_rate: number;
  read_rate: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppCampaign {
  account_id: string;
  name: string;
  description?: string;
  campaign_type?: 'broadcast' | 'drip' | 'triggered' | 'promotional' | 'transactional';
  template_id?: string;
  message_content?: Record<string, unknown>;
  audience_filters?: Record<string, unknown>;
  contact_list?: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
  scheduled_at?: string;
  messages_per_minute?: number;
}

export interface CampaignStats {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  delivery_rate: number;
  read_rate: number;
  pending: number;
  started_at?: string;
  completed_at?: string;
}

export interface CampaignRecipient {
  id: string;
  campaign: string;
  phone_number: string;
  contact_name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  message_id: string;
  whatsapp_message_id: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_code: string;
  error_message: string;
  variables: Record<string, string>;
  created_at: string;
}

export interface ContactInput {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

export interface ScheduledMessage {
  id: string;
  account: string;
  to_number: string;
  contact_name: string;
  message_type: string;
  content: Record<string, unknown>;
  template?: string;
  template_variables: Record<string, string>;
  scheduled_at: string;
  timezone: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  message_id: string;
  whatsapp_message_id: string;
  sent_at?: string;
  error_code: string;
  error_message: string;
  is_recurring: boolean;
  recurrence_rule: string;
  next_occurrence?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessage {
  account_id: string;
  to_number: string;
  contact_name?: string;
  message_type?: string;
  content: Record<string, unknown>;
  template_id?: string;
  template_variables?: Record<string, string>;
  scheduled_at: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface ScheduledMessageStats {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export interface ContactList {
  id: string;
  account: string;
  name: string;
  description: string;
  contacts: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
  contact_count: number;
  source: string;
  imported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactList {
  account_id: string;
  name: string;
  description?: string;
  contacts: Array<{ phone: string; name?: string; variables?: Record<string, string> }>;
}
