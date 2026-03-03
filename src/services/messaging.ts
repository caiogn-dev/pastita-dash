import api from './api';

/**
 * Unified Messaging Service - API V2
 * Gerencia todas as plataformas de mensagem (WhatsApp, Instagram, Messenger)
 */

// ==================== PLATFORM ACCOUNTS ====================

export const getPlatformAccounts = (params?: { platform?: string; is_active?: boolean }) =>
  api.get('/messaging/platform-accounts/', { params });

export const getPlatformAccount = (id: string) =>
  api.get(`/messaging/platform-accounts/${id}/`);

export const createPlatformAccount = (data: {
  platform: 'whatsapp' | 'instagram' | 'messenger';
  name: string;
  phone_number?: string;
  access_token?: string;
}) => api.post('/messaging/platform-accounts/', data);

export const updatePlatformAccount = (id: string, data: Partial<{
  name: string;
  phone_number: string;
  access_token: string;
  is_active: boolean;
}>) => api.patch(`/messaging/platform-accounts/${id}/`, data);

export const deletePlatformAccount = (id: string) =>
  api.delete(`/messaging/platform-accounts/${id}/`);

// QR Code para WhatsApp
export const getWhatsAppQR = (accountId: string) =>
  api.get(`/messaging/platform-accounts/${accountId}/qr/`);

export const getConnectionStatus = (accountId: string) =>
  api.get(`/messaging/platform-accounts/${accountId}/status/`);

export const disconnectPlatform = (accountId: string) =>
  api.post(`/messaging/platform-accounts/${accountId}/disconnect/`);

// ==================== CONVERSATIONS ====================

export const getConversations = (params?: {
  store?: string;
  platform?: string;
  is_open?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => api.get('/messaging/conversations/', { params });

export const getConversation = (id: string) =>
  api.get(`/messaging/conversations/${id}/`);

export const createConversation = (data: {
  store: string;
  customer_phone: string;
  customer_name?: string;
  platform?: string;
}) => api.post('/messaging/conversations/', data);

export const closeConversation = (id: string) =>
  api.patch(`/messaging/conversations/${id}/`, { is_open: false });

export const reopenConversation = (id: string) =>
  api.patch(`/messaging/conversations/${id}/`, { is_open: true });

// ==================== MESSAGES ====================

export const getMessages = (params?: {
  conversation?: string;
  limit?: number;
  offset?: number;
}) => api.get('/messaging/messages/', { params });

export const sendMessage = (data: {
  conversation: string;
  text: string;
  media_url?: string;
}) => api.post('/messaging/messages/', data);

export const sendTemplateMessage = (data: {
  conversation: string;
  template_name: string;
  language?: string;
  components?: any[];
}) => api.post('/messaging/messages/send-template/', data);

// ==================== MESSAGE TEMPLATES ====================

export const getMessageTemplates = (params?: { status?: string; language?: string }) =>
  api.get('/messaging/templates/', { params });

export const getMessageTemplate = (id: string) =>
  api.get(`/messaging/templates/${id}/`);

export const createMessageTemplate = (data: {
  name: string;
  category: string;
  language: string;
  header?: any;
  body: string;
  footer?: string;
  buttons?: any[];
}) => api.post('/messaging/templates/', data);

// ==================== ANALYTICS & REPORTS ====================

export const getMessagingStats = (params?: { start_date?: string; end_date?: string; store?: string }) =>
  api.get('/messaging/stats/', { params });

export const getConversationMetrics = (params?: { days?: number; store?: string }) =>
  api.get('/messaging/metrics/conversations/', { params });

export const getMessageMetrics = (params?: { days?: number; store?: string }) =>
  api.get('/messaging/metrics/messages/', { params });

export const getPlatformBreakdown = (params?: { days?: number; store?: string }) =>
  api.get('/messaging/metrics/platforms/', { params });

// ==================== WEBHOOK ====================

export const getWebhookStatus = () =>
  api.get('/messaging/webhook-status/');

export const regenerateWebhookToken = () =>
  api.post('/messaging/webhook/regenerate-token/');

// ==================== EXPORT ====================

export const exportConversations = (params?: { start_date?: string; end_date?: string; format?: 'csv' | 'json' }) =>
  api.get('/messaging/export/conversations/', { params, responseType: 'blob' });

export const exportMessages = (params?: { conversation?: string; format?: 'csv' | 'json' }) =>
  api.get('/messaging/export/messages/', { params, responseType: 'blob' });

// ==================== SERVICE OBJECT ====================

export const messagingService = {
  // Platform Accounts
  getPlatformAccounts,
  getPlatformAccount,
  createPlatformAccount,
  updatePlatformAccount,
  deletePlatformAccount,
  getWhatsAppQR,
  getConnectionStatus,
  disconnectPlatform,

  // Conversations
  getConversations,
  getConversation,
  createConversation,
  closeConversation,
  reopenConversation,

  // Messages
  getMessages,
  sendMessage,
  sendTemplateMessage,

  // Templates
  getMessageTemplates,
  getMessageTemplate,
  createMessageTemplate,

  // Analytics
  getMessagingStats,
  getConversationMetrics,
  getMessageMetrics,
  getPlatformBreakdown,

  // Webhook
  getWebhookStatus,
  regenerateWebhookToken,

  // Export
  exportConversations,
  exportMessages,
};

export default messagingService;
