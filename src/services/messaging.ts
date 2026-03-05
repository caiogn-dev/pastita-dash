import api from './api';

/**
 * Messaging Service - API para WhatsApp, Messenger, Instagram
 * 
 * WhatsApp: /api/v1/whatsapp/
 * Messenger: /api/v1/messenger/ (quando implementado)
 * Instagram: /api/v1/instagram/ (quando implementado)
 */

// ==================== TYPES ====================
export interface WhatsAppAccount {
  id: string;
  name: string;
  phone_number: string;
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
  webhook_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  account: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string;
  media_url?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  external_id?: string;
  created_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  account: string;
  name: string;
  language: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  header?: Record<string, any>;
  body: string;
  footer?: string;
  buttons?: any[];
}

// ==================== WHATSAPP ACCOUNTS ====================
const WHATSAPP_BASE = '/whatsapp';

/**
 * Listar contas WhatsApp
 */
export const getWhatsAppAccounts = () =>
  api.get(`${WHATSAPP_BASE}/accounts/`);

/**
 * Obter conta WhatsApp específica
 */
export const getWhatsAppAccount = (id: string) =>
  api.get(`${WHATSAPP_BASE}/accounts/${id}/`);

/**
 * Criar conta WhatsApp
 */
export const createWhatsAppAccount = (data: {
  name: string;
  phone_number: string;
  phone_number_id: string;
  waba_id: string;
  access_token_encrypted?: string;
}) => api.post(`${WHATSAPP_BASE}/accounts/`, data);

/**
 * Atualizar conta WhatsApp
 */
export const updateWhatsAppAccount = (id: string, data: Partial<{
  name: string;
  phone_number: string;
  status: string;
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
}>) => api.patch(`${WHATSAPP_BASE}/accounts/${id}/`, data);

/**
 * Excluir conta WhatsApp
 */
export const deleteWhatsAppAccount = (id: string) =>
  api.delete(`${WHATSAPP_BASE}/accounts/${id}/`);

// ==================== WHATSAPP MESSAGES ====================

/**
 * Listar mensagens WhatsApp
 */
export const getWhatsAppMessages = (params?: {
  account?: string;
  direction?: string;
  status?: string;
}) => api.get(`${WHATSAPP_BASE}/messages/`, { params });

/**
 * Enviar mensagem WhatsApp
 */
export const sendWhatsAppMessage = (data: {
  account: string;
  to: string;
  content: string;
  message_type?: string;
}) => api.post(`${WHATSAPP_BASE}/messages/`, data);

// ==================== WHATSAPP TEMPLATES ====================

/**
 * Listar templates WhatsApp
 */
export const getWhatsAppTemplates = (params?: {
  account?: string;
  status?: string;
}) => api.get(`${WHATSAPP_BASE}/templates/`, { params });

/**
 * Sincronizar templates do WhatsApp Business API
 */
export const syncWhatsAppTemplates = (accountId: string) =>
  api.post(`${WHATSAPP_BASE}/accounts/${accountId}/sync_templates/`);

// ==================== CONVERSATIONS (LEGACY) ====================

/**
 * Listar conversas - usar conversations service
 * @deprecated Use conversations.ts
 */
export const getConversations = (params?: {
  account?: string;
  customer_phone?: string;
  is_open?: boolean;
}) => api.get('/conversations/', { params });

/**
 * Obter conversa específica
 * @deprecated Use conversations.ts
 */
export const getConversation = (id: string) =>
  api.get(`/conversations/${id}/`);

/**
 * Enviar mensagem em uma conversa
 * @deprecated Use conversations.ts
 */
export const sendMessage = (conversationId: string, data: {
  content: string;
  message_type?: string;
}) => api.post(`/conversations/${conversationId}/send_message/`, data);

// ==================== LEGACY COMPATIBILITY ====================

// Aliases para código antigo que usa messaging service
export const getPlatformAccounts = getWhatsAppAccounts;
export const getPlatformAccount = getWhatsAppAccount;
export const createPlatformAccount = createWhatsAppAccount;
export const updatePlatformAccount = updateWhatsAppAccount;
export const deletePlatformAccount = deleteWhatsAppAccount;

// Export default
export default {
  // WhatsApp Accounts
  getWhatsAppAccounts,
  getWhatsAppAccount,
  createWhatsAppAccount,
  updateWhatsAppAccount,
  deleteWhatsAppAccount,
  // Messages
  getWhatsAppMessages,
  sendWhatsAppMessage,
  // Templates
  getWhatsAppTemplates,
  syncWhatsAppTemplates,
  // Conversations (legacy)
  getConversations,
  getConversation,
  sendMessage,
  // Aliases
  getPlatformAccounts,
  getPlatformAccount,
  createPlatformAccount,
  updatePlatformAccount,
  deletePlatformAccount,
};
