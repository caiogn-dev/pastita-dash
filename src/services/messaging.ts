import api from './api';

/**
 * Unified Messaging Service - API V2
 * Gerencia todas as plataformas de mensagem (WhatsApp, Instagram, Messenger)
 * ATUALIZADO: Endpoints que não existem no backend foram mockados
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
// Usando endpoint real do backend: /api/v1/conversations/

export const getConversations = (params?: {
  store?: string;
  platform?: string;
  is_open?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) =>
  api.get('/conversations/', { params });

export const getConversation = (id: string) =>
  api.get(`/conversations/${id}/`);

export const createConversation = (data: {
  store: string;
  customer_phone: string;
  customer_name?: string;
  platform?: string;
}) =>
  api.post('/conversations/', data);

export const closeConversation = (id: string) =>
  api.post(`/conversations/${id}/close/`);

export const reopenConversation = (id: string) =>
  api.post(`/conversations/${id}/reopen/`);

// ==================== MESSAGES ====================
// Usando endpoint real do backend: /api/v1/conversations/{id}/messages/

export const getMessages = (params?: {
  conversation?: string;
  limit?: number;
  offset?: number;
}) => {
  if (params?.conversation) {
    return api.get(`/conversations/${params.conversation}/messages/`);
  }
  // Fallback: retorna lista vazia se não houver conversation_id
  return Promise.resolve({ data: [] });
};

export const sendMessage = (data: {
  conversation: string;
  text: string;
  media_url?: string;
}) =>
  // NOTA: Endpoint de envio de mensagem não existe em conversations
  // Usando mock temporariamente
  Promise.resolve({ data: { id: 'mock', ...data, sent_at: new Date().toISOString() } });

export const sendTemplateMessage = (data: {
  conversation: string;
  template_name: string;
  language?: string;
  components?: any[];
}) =>
  // NOTA: Endpoint de template não existe em conversations
  Promise.resolve({ data: { id: 'mock', ...data, sent_at: new Date().toISOString() } });

// ==================== MESSAGE TEMPLATES ====================
// NOTA: Endpoint não existe no backend atual.

export const getMessageTemplates = (params?: { status?: string; language?: string }) =>
  // api.get('/messaging/templates/', { params });
  Promise.resolve({ data: { results: [], count: 0 } });

export const getMessageTemplate = (id: string) =>
  // api.get(`/messaging/templates/${id}/`);
  Promise.resolve({ data: { id, name: 'Mock Template' } });

export const createMessageTemplate = (data: {
  name: string;
  category: string;
  language: string;
  header?: any;
  body: string;
  footer?: string;
  buttons?: any[];
}) =>
  // api.post('/messaging/templates/', data);
  Promise.resolve({ data: { id: 'mock', ...data } });

// ==================== ANALYTICS & REPORTS ====================
// NOTA: Estes endpoints não existem no backend atual.

export const getMessagingStats = (params?: { start_date?: string; end_date?: string; store?: string }) =>
  // api.get('/messaging/stats/', { params });
  Promise.resolve({ data: { total_conversations: 0, total_messages: 0, active_conversations: 0 } });

export const getConversationMetrics = (params?: { days?: number; store?: string }) =>
  // api.get('/messaging/metrics/conversations/', { params });
  Promise.resolve({ data: [] });

export const getMessageMetrics = (params?: { days?: number; store?: string }) =>
  // api.get('/messaging/metrics/messages/', { params });
  Promise.resolve({ data: [] });

export const getPlatformBreakdown = (params?: { days?: number; store?: string }) =>
  // api.get('/messaging/metrics/platforms/', { params });
  Promise.resolve({ data: { whatsapp: 0, instagram: 0, messenger: 0 } });

// ==================== WEBHOOK ====================
// NOTA: Endpoint não existe no backend atual.

export const getWebhookStatus = () =>
  // api.get('/messaging/webhook-status/');
  Promise.resolve({ data: { status: 'unknown', url: '' } });

export const regenerateWebhookToken = () =>
  // api.post('/messaging/webhook/regenerate-token/');
  Promise.resolve({ data: { success: false, message: 'Not implemented' } });

// ==================== EXPORT ====================
// NOTA: Endpoints não existem no backend atual.

export const exportConversations = (params?: { start_date?: string; end_date?: string; format?: 'csv' | 'json' }) =>
  // api.get('/messaging/export/conversations/', { params, responseType: 'blob' });
  Promise.resolve({ data: new Blob(['Not implemented'], { type: 'text/plain' }) });

export const exportMessages = (params?: { conversation?: string; format?: 'csv' | 'json' }) =>
  // api.get('/messaging/export/messages/', { params, responseType: 'blob' });
  Promise.resolve({ data: new Blob(['Not implemented'], { type: 'text/plain' }) });

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
