import api from './api';

/**
 * Unified Messaging Service - API V2
 * Gerencia todas as plataformas de mensagem (WhatsApp, Instagram, Messenger)
 * ATUALIZADO: Endpoints migrados de /messaging/platform-accounts/ para /messaging/messenger/accounts/
 */

// ==================== PLATFORM ACCOUNTS ====================
// ATUALIZADO: Endpoint correto é /messaging/messenger/accounts/
export const getPlatformAccounts = (params?: { platform?: string; is_active?: boolean }) =>
  api.get('/messaging/messenger/accounts/', { params });

export const getPlatformAccount = (id: string) =>
  api.get(`/messaging/messenger/accounts/${id}/`);

export const createPlatformAccount = (data: {
  platform: 'whatsapp' | 'instagram' | 'messenger';
  name: string;
  // Campos específicos por plataforma
  page_id?: string;        // Para Messenger (obrigatório)
  page_name?: string;      // Para Messenger (obrigatório)
  page_access_token?: string;  // Para Messenger (obrigatório)
  phone_number?: string;   // Para WhatsApp
  access_token?: string;   // Para Instagram
}) => {
  // Para WhatsApp: usar endpoint específico /whatsapp/accounts/
  if (data.platform === 'whatsapp') {
    return api.post('/whatsapp/accounts/', {
      name: data.name,
      phone_number: data.phone_number,
      access_token: data.access_token,
    });
  }

  // Para Messenger: usar endpoint /messaging/messenger/accounts/
  if (data.platform === 'messenger') {
    return api.post('/messaging/messenger/accounts/', {
      page_id: data.page_id,
      page_name: data.page_name || data.name,
      page_access_token: data.page_access_token,
    });
  }

  // Para Instagram: endpoint ainda não implementado
  if (data.platform === 'instagram') {
    return Promise.reject(new Error('Instagram ainda não implementado'));
  }

  return Promise.reject(new Error('Plataforma não suportada'));
};

export const updatePlatformAccount = (id: string, data: Partial<{
  name: string;
  phone_number: string;
  access_token: string;
  is_active: boolean;
}>) => api.patch(`/messaging/messenger/accounts/${id}/`, data);

export const deletePlatformAccount = (id: string) =>
  api.delete(`/messaging/messenger/accounts/${id}/`);

// QR Code para WhatsApp
export const getWhatsAppQR = (accountId: string) =>
  api.get(`/messaging/messenger/accounts/${accountId}/qr/`);

export const getConnectionStatus = (accountId: string) =>
  api.get(`/messaging/messenger/accounts/${accountId}/status/`);

export const disconnectPlatform = (accountId: string) =>
  api.post(`/messaging/messenger/accounts/${accountId}/disconnect/`);

// ==================== CONVERSATIONS ====================
// Usando endpoint real do backend: /api/v1/conversations/
export const getConversations = (params?: {
  store?: string;
  platform?: string;
  is_open?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => api.get('/conversations/', { params });

export const getConversation = (id: string) =>
  api.get(`/conversations/${id}/`);

export const createConversation = (data: {
  store: string;
  customer_phone: string;
  customer_name?: string;
  platform?: string;
}) => api.post('/conversations/', data);

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
  components?: Record<string, unknown>[];
}) =>
  // NOTA: Endpoint de templates não existe no backend
  // Usando mock temporariamente
  Promise.resolve({
    data: {
      id: 'mock-template',
      ...data,
      sent_at: new Date().toISOString()
    }
  });

// ==================== TEMPLATES ====================
// NOTA: Endpoint de templates não existe no backend - mockado
export const getTemplates = (platformAccountId?: string) =>
  Promise.resolve({ data: { results: [] } });

export const getTemplate = (id: string) =>
  Promise.resolve({ data: { id, name: 'mock' } });

export const createTemplate = (data: Record<string, unknown>) =>
  Promise.resolve({ data: { id: 'mock', ...data } });

// ==================== ANALYTICS ====================
// NOTA: Endpoints de analytics não existem no backend - mockado
export const getMessagingStats = (params?: { store?: string; days?: number }) =>
  Promise.resolve({
    data: {
      total_conversations: 0,
      active_conversations: 0,
      messages_sent: 0,
      messages_delivered: 0,
      messages_read: 0,
      avg_response_time: 0,
    }
  });

export const getPlatformMetrics = (platformAccountId: string, days = 30) =>
  Promise.resolve({
    data: {
      total_messages: 0,
      conversations: 0,
      response_rate: 0,
      avg_response_time: 0,
      daily_stats: [],
    }
  });

// ==================== WEBHOOKS ====================
export const getWebhooks = () =>
  api.get('/messaging/webhooks/');

export const getWebhook = (id: string) =>
  api.get(`/messaging/webhooks/${id}/`);

export const createWebhook = (data: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
}) => api.post('/messaging/webhooks/', data);

export const updateWebhook = (id: string, data: Partial<{
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
}>) => api.patch(`/messaging/webhooks/${id}/`, data);

export const deleteWebhook = (id: string) =>
  api.delete(`/messaging/webhooks/${id}/`);

export const testWebhook = (id: string) =>
  api.post(`/messaging/webhooks/${id}/test/`);

// ==================== EXPORTS ====================
export default {
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
  getTemplates,
  getTemplate,
  createTemplate,
  // Analytics
  getMessagingStats,
  getPlatformMetrics,
  // Webhooks
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
};
