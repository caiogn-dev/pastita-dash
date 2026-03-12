import api from './api';

export interface MessengerAccount {
  id: string;
  name: string;
  page_id: string;
  page_name: string;
  page_access_token?: string;  // write-only, not returned in responses
  status: 'active' | 'inactive' | 'suspended';
  is_active: boolean;
  webhook_verified: boolean;
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessengerConversation {
  id: string;
  account: string;
  account_name?: string;
  sender_id: string;
  sender_name: string;
  status: 'open' | 'closed' | 'pending';
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_bot_active: boolean;
  handover_status: 'bot' | 'human' | 'pending';
  assigned_to?: number;
  created_at: string;
  updated_at: string;
}

export interface MessengerMessage {
  id: string;
  conversation: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template';
  media_url?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  quick_replies?: Array<{
    title: string;
    payload: string;
  }>;
  buttons?: Array<{
    type: string;
    title: string;
    url?: string;
    payload?: string;
  }>;
  is_from_bot: boolean;
  is_read: boolean;
  mid?: string;  // Messenger message ID
  created_at: string;
}

export interface MessengerProfile {
  greeting?: Array<{
    locale: string;
    text: string;
  }>;
  ice_breakers?: Array<{
    question: string;
    payload: string;
  }>;
  persistent_menu?: Array<{
    locale: string;
    composer_input_disabled: boolean;
    call_to_actions: Array<{
      type: string;
      title: string;
      url?: string;
      payload?: string;
    }>;
  }>;
  whitelisted_domains?: string[];
}

export interface BroadcastMessage {
  id: string;
  account: string;
  name: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'template';
  target_audience: 'all' | 'segment';
  segment_criteria?: Record<string, any>;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
}

export interface SponsoredMessage {
  id: string;
  account: string;
  name: string;
  content: string;
  image_url?: string;
  cta_type: string;
  cta_url?: string;
  budget: number;
  currency: string;
  targeting: Record<string, any>;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed';
  created_at: string;
}

const BASE_URL = '/messaging/messenger';

export const messengerService = {
  // Accounts
  getAccounts: () => api.get<MessengerAccount[]>(`${BASE_URL}/accounts/`),
  
  getAccount: (id: string) => api.get<MessengerAccount>(`${BASE_URL}/accounts/${id}/`),
  
  createAccount: (data: {
    name: string;
    page_id: string;
    page_name: string;
    page_access_token: string;
  }) => api.post<MessengerAccount>(`${BASE_URL}/accounts/`, data),
  
  updateAccount: (id: string, data: Partial<MessengerAccount>) =>
    api.patch<MessengerAccount>(`${BASE_URL}/accounts/${id}/`, data),
  
  deleteAccount: (id: string) => api.delete(`${BASE_URL}/accounts/${id}/`),
  
  verifyWebhook: (id: string) => api.post(`${BASE_URL}/accounts/${id}/sync/`),
  
  // Toggle auto-response
  toggleAutoResponse: (id: string, enabled: boolean) =>
    api.patch<MessengerAccount>(`${BASE_URL}/accounts/${id}/`, { auto_response_enabled: enabled }),
  
  // Toggle human handoff
  toggleHumanHandoff: (id: string, enabled: boolean) =>
    api.patch<MessengerAccount>(`${BASE_URL}/accounts/${id}/`, { human_handoff_enabled: enabled }),
  
  // Conversations
  getConversations: (accountId?: string) =>
    api.get<MessengerConversation[]>(`${BASE_URL}/conversations/`, {
      params: accountId ? { account: accountId } : undefined,
    }),
  
  getConversation: (id: string) =>
    api.get<MessengerConversation>(`${BASE_URL}/conversations/${id}/`),
  
  markAsRead: (conversationId: string) =>
    api.post(`${BASE_URL}/conversations/${conversationId}/mark_read/`),
  
  // Messages
  getMessages: (conversationId: string, params?: { limit?: number; offset?: number }) =>
    api.get<MessengerMessage[]>(`${BASE_URL}/conversations/${conversationId}/messages/`, { params }),
  
  sendMessage: (conversationId: string, data: {
    content: string;
    message_type?: string;
    attachments?: any[];
    quick_replies?: any[];
  }) => api.post<MessengerMessage>(`${BASE_URL}/conversations/${conversationId}/send_message/`, {
    content: data.content,
    type: data.message_type || 'text',
    attachments: data.attachments,
    quick_replies: data.quick_replies,
  }),
  
  // Profile
  getProfile: (accountId: string) =>
    api.get<MessengerProfile>(`${BASE_URL}/profile/get/`, { params: { account_id: accountId } }),
  
  updateProfile: async (accountId: string, data: MessengerProfile) => {
    if (data.greeting?.length) {
      await api.post(`${BASE_URL}/profile/greeting/`, {
        text: data.greeting[0].text,
        locale: data.greeting[0].locale || 'default',
      }, { params: { account_id: accountId } });
    }
    if (data.ice_breakers?.length) {
      await api.post(`${BASE_URL}/profile/ice_breakers/`, {
        ice_breakers: data.ice_breakers,
      }, { params: { account_id: accountId } });
    }
    if (data.persistent_menu?.length) {
      await api.post(`${BASE_URL}/profile/persistent_menu/`, {
        menu_items: data.persistent_menu[0].call_to_actions || [],
      }, { params: { account_id: accountId } });
    }
    if (data.whitelisted_domains?.length) {
      await api.post(`${BASE_URL}/profile/whitelist_domains/`, {
        domains: data.whitelisted_domains,
      }, { params: { account_id: accountId } });
    }
    return { data };
  },
  
  // Broadcast
  getBroadcasts: (accountId?: string) =>
    api.get<BroadcastMessage[]>(`${BASE_URL}/broadcasts/`, {
      params: accountId ? { account: accountId } : undefined,
    }),
  
  getBroadcast: (id: string) => api.get<BroadcastMessage>(`${BASE_URL}/broadcasts/${id}/`),
  
  createBroadcast: (data: Partial<BroadcastMessage>) =>
    api.post<BroadcastMessage>(`${BASE_URL}/broadcasts/`, data),
  
  updateBroadcast: (id: string, data: Partial<BroadcastMessage>) =>
    api.patch<BroadcastMessage>(`${BASE_URL}/broadcasts/${id}/`, data),
  
  deleteBroadcast: (id: string) => api.delete(`${BASE_URL}/broadcasts/${id}/`),
  
  scheduleBroadcast: (id: string, scheduledAt: string) =>
    api.patch(`${BASE_URL}/broadcasts/${id}/`, { scheduled_at: scheduledAt, status: 'scheduled' }),
  
  cancelBroadcast: (id: string) =>
    api.patch(`${BASE_URL}/broadcasts/${id}/`, { status: 'cancelled' }),
  
  sendBroadcast: (id: string) =>
    api.post(`${BASE_URL}/broadcasts/${id}/send/`),
  
  getBroadcastStats: (id: string) =>
    api.get(`${BASE_URL}/broadcasts/${id}/insights/`),
  
  // Sponsored Messages
  getSponsoredMessages: (accountId?: string) =>
    api.get<SponsoredMessage[]>(`${BASE_URL}/sponsored/`, {
      params: accountId ? { account: accountId } : undefined,
    }),
  
  getSponsoredMessage: (id: string) =>
    api.get<SponsoredMessage>(`${BASE_URL}/sponsored/${id}/`),
  
  createSponsoredMessage: (data: Partial<SponsoredMessage>) =>
    api.post<SponsoredMessage>(`${BASE_URL}/sponsored/`, data),
  
  updateSponsoredMessage: (id: string, data: Partial<SponsoredMessage>) =>
    api.patch<SponsoredMessage>(`${BASE_URL}/sponsored/${id}/`, data),
  
  deleteSponsoredMessage: (id: string) => api.delete(`${BASE_URL}/sponsored/${id}/`),
  
  publishSponsoredMessage: (id: string) =>
    api.post(`${BASE_URL}/sponsored/${id}/submit/`),
  
  pauseSponsoredMessage: (id: string) =>
    api.post(`${BASE_URL}/sponsored/${id}/pause/`),
};

export default messengerService;
