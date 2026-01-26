import api from './api';

// Types
export interface InstagramAccount {
  id: string;
  name: string;
  instagram_account_id: string;
  instagram_user_id: string;
  facebook_page_id: string;
  username: string;
  app_id: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'expired';
  messaging_enabled: boolean;
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
  profile_picture_url: string;
  followers_count: number;
  masked_token: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInstagramAccount {
  name: string;
  instagram_account_id: string;
  instagram_user_id: string;
  facebook_page_id: string;
  username: string;
  app_id: string;
  app_secret: string;
  access_token: string;
  webhook_verify_token?: string;
  messaging_enabled?: boolean;
  auto_response_enabled?: boolean;
}

export interface InstagramConversation {
  id: string;
  participant_id: string;
  participant_username: string;
  participant_name: string;
  participant_profile_pic: string;
  status: 'active' | 'closed' | 'archived';
  message_count: number;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramMessage {
  id: string;
  instagram_message_id: string;
  conversation: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'share' | 'story_mention' | 'story_reply' | 'reaction' | 'deleted' | 'unknown';
  status: 'pending' | 'sent' | 'delivered' | 'seen' | 'failed';
  sender_id: string;
  recipient_id: string;
  text_content: string;
  media_url: string;
  media_type: string;
  shared_media_id: string;
  shared_media_url: string;
  reply_to_message_id: string;
  sent_at: string | null;
  delivered_at: string | null;
  seen_at: string | null;
  error_code: string;
  error_message: string;
  created_at: string;
}

export interface SendInstagramMessage {
  account_id: string;
  recipient_id: string;
  text?: string;
  image_url?: string;
  video_url?: string;
  quick_replies?: Array<{ title: string; payload: string }>;
}

export interface InstagramAccountStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
}

export interface IceBreaker {
  question: string;
  payload: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Service
export const instagramService = {
  // ==================== Accounts ====================
  
  getAccounts: async (): Promise<PaginatedResponse<InstagramAccount>> => {
    const response = await api.get<PaginatedResponse<InstagramAccount>>('/instagram/accounts/');
    return response.data;
  },

  getAccount: async (id: string): Promise<InstagramAccount> => {
    const response = await api.get<InstagramAccount>(`/instagram/accounts/${id}/`);
    return response.data;
  },

  createAccount: async (data: CreateInstagramAccount): Promise<InstagramAccount> => {
    const response = await api.post<InstagramAccount>('/instagram/accounts/', data);
    return response.data;
  },

  updateAccount: async (id: string, data: Partial<CreateInstagramAccount>): Promise<InstagramAccount> => {
    const response = await api.patch<InstagramAccount>(`/instagram/accounts/${id}/`, data);
    return response.data;
  },

  deleteAccount: async (id: string): Promise<void> => {
    await api.delete(`/instagram/accounts/${id}/`);
  },

  syncProfile: async (id: string): Promise<InstagramAccount> => {
    const response = await api.get<InstagramAccount>(`/instagram/accounts/${id}/sync_profile/`);
    return response.data;
  },

  refreshToken: async (id: string): Promise<{ success: boolean; message: string; expires_at: string }> => {
    const response = await api.post(`/instagram/accounts/${id}/refresh_token/`);
    return response.data;
  },

  getAccountStats: async (id: string): Promise<InstagramAccountStats> => {
    const response = await api.get<InstagramAccountStats>(`/instagram/accounts/${id}/stats/`);
    return response.data;
  },

  setIceBreakers: async (id: string, iceBreakers: IceBreaker[]): Promise<{ success: boolean }> => {
    const response = await api.post(`/instagram/accounts/${id}/set_ice_breakers/`, { ice_breakers: iceBreakers });
    return response.data;
  },

  // ==================== Conversations ====================

  getConversations: async (params?: {
    account_id?: string;
    status?: string;
  }): Promise<PaginatedResponse<InstagramConversation>> => {
    const response = await api.get<PaginatedResponse<InstagramConversation>>('/instagram/conversations/', { params });
    return response.data;
  },

  getConversation: async (id: string): Promise<InstagramConversation> => {
    const response = await api.get<InstagramConversation>(`/instagram/conversations/${id}/`);
    return response.data;
  },

  closeConversation: async (id: string): Promise<InstagramConversation> => {
    const response = await api.post<InstagramConversation>(`/instagram/conversations/${id}/close/`);
    return response.data;
  },

  reopenConversation: async (id: string): Promise<InstagramConversation> => {
    const response = await api.post<InstagramConversation>(`/instagram/conversations/${id}/reopen/`);
    return response.data;
  },

  assignConversation: async (id: string, userId: string | null): Promise<InstagramConversation> => {
    const response = await api.post<InstagramConversation>(`/instagram/conversations/${id}/assign/`, { user_id: userId });
    return response.data;
  },

  // ==================== Messages ====================

  getMessages: async (params?: {
    conversation_id?: string;
    account_id?: string;
  }): Promise<PaginatedResponse<InstagramMessage>> => {
    const response = await api.get<PaginatedResponse<InstagramMessage>>('/instagram/messages/', { params });
    return response.data;
  },

  getMessage: async (id: string): Promise<InstagramMessage> => {
    const response = await api.get<InstagramMessage>(`/instagram/messages/${id}/`);
    return response.data;
  },

  sendMessage: async (data: SendInstagramMessage): Promise<InstagramMessage> => {
    const response = await api.post<InstagramMessage>('/instagram/messages/', data);
    return response.data;
  },

  markSeen: async (accountId: string, recipientId: string): Promise<{ success: boolean }> => {
    const response = await api.post('/instagram/messages/mark_seen/', {
      account_id: accountId,
      recipient_id: recipientId,
    });
    return response.data;
  },

  sendTyping: async (accountId: string, recipientId: string, typingOn: boolean = true): Promise<{ success: boolean }> => {
    const response = await api.post('/instagram/messages/typing/', {
      account_id: accountId,
      recipient_id: recipientId,
      typing_on: typingOn,
    });
    return response.data;
  },
};

export default instagramService;
