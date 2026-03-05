import api from './api';

/**
 * Unified Messaging Service - API V2
 * Gerencia todas as plataformas de mensagem (WhatsApp, Instagram, Messenger)
 * 
 * Endpoint unificado: /api/v1/messaging/v2/platform-accounts/
 */

// ==================== TYPES ====================
export interface PlatformAccount {
  id: string;
  platform: 'whatsapp' | 'messenger' | 'instagram';
  platform_display: string;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  status_display: string;
  is_active: boolean;
  is_verified: boolean;
  webhook_verified: boolean;
  
  // Campos WhatsApp
  phone_number?: string;
  phone_number_id?: string;
  waba_id?: string;
  display_phone_number?: string;
  
  // Campos Messenger
  page_id?: string;
  page_name?: string;
  
  // Campos Instagram
  instagram_account_id?: string;
  
  // Configurações
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
  category?: string;
  followers_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface CreatePlatformAccountData {
  platform: 'whatsapp' | 'messenger' | 'instagram';
  name: string;
  
  // WhatsApp
  phone_number_id?: string;
  waba_id?: string;
  phone_number?: string;
  display_phone_number?: string;
  
  // Messenger
  page_id?: string;
  page_name?: string;
  
  // Instagram
  instagram_account_id?: string;
  
  // Comum
  access_token?: string;
  webhook_verify_token?: string;
  auto_response_enabled?: boolean;
  human_handoff_enabled?: boolean;
}

export interface Conversation {
  id: string;
  platform_account: string;
  platform_account_name: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_profile_pic?: string;
  platform: string;
  platform_display: string;
  is_open: boolean;
  unread_count: number;
  last_message_at: string;
  last_message?: {
    id: string;
    text: string;
    message_type: string;
    direction: string;
    status: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UnifiedMessage {
  id: string;
  conversation: string;
  conversation_id: string;
  customer_name: string;
  customer_phone: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  status_display: string;
  message_type: string;
  text: string;
  media_url?: string;
  media_caption?: string;
  external_id?: string;
  template_name?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  platform_account: string;
  platform_account_name: string;
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  category_display: string;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  header?: Record<string, any>;
  body: string;
  footer?: string;
  buttons?: any[];
  external_id?: string;
  created_at: string;
  updated_at: string;
}

// ==================== PLATFORM ACCOUNTS ====================
const API_BASE = '/messaging/v2';

/**
 * Listar todas as contas de plataforma do usuário
 */
export const getPlatformAccounts = (params?: { 
  platform?: string; 
  is_active?: boolean;
  is_verified?: boolean;
  status?: string;
}) => api.get(`${API_BASE}/platform-accounts/`, { params });

/**
 * Listar contas agrupadas por plataforma
 */
export const getPlatformAccountsByPlatform = () => 
  api.get(`${API_BASE}/platform-accounts/by_platform/`);

/**
 * Obter uma conta específica
 */
export const getPlatformAccount = (id: string) =>
  api.get(`${API_BASE}/platform-accounts/${id}/`);

/**
 * Criar nova conta de plataforma (WhatsApp, Messenger ou Instagram)
 */
export const createPlatformAccount = (data: CreatePlatformAccountData) =>
  api.post(`${API_BASE}/platform-accounts/`, data);

/**
 * Atualizar conta existente
 */
export const updatePlatformAccount = (id: string, data: Partial<CreatePlatformAccountData>) =>
  api.patch(`${API_BASE}/platform-accounts/${id}/`, data);

/**
 * Excluir conta
 */
export const deletePlatformAccount = (id: string) =>
  api.delete(`${API_BASE}/platform-accounts/${id}/`);

/**
 * Ativar conta
 */
export const activatePlatformAccount = (id: string) =>
  api.post(`${API_BASE}/platform-accounts/${id}/activate/`);

/**
 * Desativar conta
 */
export const deactivatePlatformAccount = (id: string) =>
  api.post(`${API_BASE}/platform-accounts/${id}/deactivate/`);

/**
 * Sincronizar conta com a plataforma
 */
export const syncPlatformAccount = (id: string) =>
  api.post(`${API_BASE}/platform-accounts/${id}/sync/`);

/**
 * Sincronizar templates do WhatsApp
 */
export const syncWhatsAppTemplates = (id: string) =>
  api.post(`${API_BASE}/platform-accounts/${id}/sync_templates/`);

// ==================== CONVERSATIONS ====================

/**
 * Listar conversas
 */
export const getConversations = (params?: {
  platform?: string;
  is_open?: boolean;
  platform_account?: string;
  search?: string;
}) => api.get(`${API_BASE}/conversations/`, { params });

/**
 * Obter conversa específica
 */
export const getConversation = (id: string) =>
  api.get(`${API_BASE}/conversations/${id}/`);

/**
 * Fechar conversa
 */
export const closeConversation = (id: string) =>
  api.post(`${API_BASE}/conversations/${id}/close/`);

/**
 * Reabrir conversa
 */
export const reopenConversation = (id: string) =>
  api.post(`${API_BASE}/conversations/${id}/reopen/`);

/**
 * Marcar conversa como lida
 */
export const markConversationAsRead = (id: string) =>
  api.post(`${API_BASE}/conversations/${id}/mark_read/`);

/**
 * Enviar mensagem em uma conversa
 */
export const sendMessage = (conversationId: string, data: {
  text: string;
  message_type?: string;
}) => api.post(`${API_BASE}/conversations/${conversationId}/send_message/`, data);

// ==================== MESSAGES ====================

/**
 * Listar mensagens
 */
export const getMessages = (params?: {
  conversation?: string;
  direction?: string;
  status?: string;
  message_type?: string;
}) => api.get(`${API_BASE}/messages/`, { params });

/**
 * Obter mensagem específica
 */
export const getMessage = (id: string) =>
  api.get(`${API_BASE}/messages/${id}/`);

// ==================== TEMPLATES ====================

/**
 * Listar templates de mensagem
 */
export const getMessageTemplates = (params?: {
  platform_account?: string;
  status?: string;
  category?: string;
  language?: string;
}) => api.get(`${API_BASE}/templates/`, { params });

/**
 * Obter template específico
 */
export const getMessageTemplate = (id: string) =>
  api.get(`${API_BASE}/templates/${id}/`);

/**
 * Criar template
 */
export const createMessageTemplate = (data: {
  platform_account: string;
  name: string;
  language?: string;
  category?: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  header?: Record<string, any>;
  body: string;
  footer?: string;
  buttons?: any[];
}) => api.post(`${API_BASE}/templates/`, data);

/**
 * Atualizar template
 */
export const updateMessageTemplate = (id: string, data: Partial<{
  name: string;
  body: string;
  footer: string;
  buttons: any[];
}>) => api.patch(`${API_BASE}/templates/${id}/`, data);

/**
 * Excluir template
 */
export const deleteMessageTemplate = (id: string) =>
  api.delete(`${API_BASE}/templates/${id}/`);

// ==================== LEGACY COMPATIBILITY ====================
// Mantidos para compatibilidade com código antigo

/** @deprecated Use getPlatformAccounts com filtro platform='whatsapp' */
export const getWhatsAppAccounts = () => 
  getPlatformAccounts({ platform: 'whatsapp' });

/** @deprecated Use getPlatformAccount */
export const getWhatsAppAccount = getPlatformAccount;

/** @deprecated Use createPlatformAccount */
export const createWhatsAppAccount = (data: { name: string; phone_number?: string; access_token?: string }) =>
  createPlatformAccount({ ...data, platform: 'whatsapp' });

/** @deprecated Use updatePlatformAccount */
export const updateWhatsAppAccount = updatePlatformAccount;

/** @deprecated Use deletePlatformAccount */
export const deleteWhatsAppAccount = deletePlatformAccount;

/** @deprecated Use syncWhatsAppTemplates */
export const syncWhatsAppAccountTemplates = syncWhatsAppTemplates;

// QR Code - mantido para compatibilidade (não implementado no v2 ainda)
export const getWhatsAppQR = (_accountId: string) =>
  Promise.reject(new Error('QR Code não implementado no messaging v2'));
