import api from './api';

/**
 * Whatsapp Service - API V2 (compatibilidade com legado)
 * ATUALIZADO: Usando /messaging/platform-accounts/ em vez de /messaging/platform-accounts/
 * NOTA: Vários endpoints foram mockados pois não existem no backend atual
 */

// Contas
export const getAccounts = (params?: { store?: string }) =>
  api.get('/messaging/platform-accounts/', { params });

export const getAccount = (id: string) =>
  api.get(`/messaging/platform-accounts/${id}/`);

export const createAccount = (data: any) =>
  api.post('/messaging/platform-accounts/', data);

export const updateAccount = (id: string, data: any) =>
  api.patch(`/messaging/platform-accounts/${id}/`, data);

export const deleteAccount = (id: string) =>
  api.delete(`/messaging/platform-accounts/${id}/`);

// Compatibilidade legado
export const deactivateAccount = (id: string) =>
  api.patch(`/messaging/platform-accounts/${id}/`, { is_active: false });

export const activateAccount = (id: string) =>
  api.patch(`/messaging/platform-accounts/${id}/`, { is_active: true });

export const syncTemplates = (id: string) =>
  api.post(`/messaging/platform-accounts/${id}/sync-templates/`);

export const rotateToken = (id: string, token: string) =>
  api.post(`/messaging/platform-accounts/${id}/rotate-token/`, { token });

// QR e Status
export const getQRCode = (accountId: string) =>
  api.get(`/messaging/platform-accounts/${accountId}/qr/`);

export const getConnectionStatus = (accountId: string) =>
  api.get(`/messaging/platform-accounts/${accountId}/status/`);

export const disconnectAccount = (accountId: string) =>
  api.post(`/messaging/platform-accounts/${accountId}/disconnect/`);

// Templates - NOTA: Endpoint não existe no backend atual
export const getTemplates = (accountId: string) =>
  // api.get('/messaging/templates/', { params: { account: accountId } });
  Promise.resolve({ data: { results: [], count: 0 } });

// Mensagens (legado) - NOTA: Endpoints não existem no backend atual
export const getMessages = (accountId: string, params?: any) =>
  // api.get('/messaging/messages/', { params: { ...params, account: accountId } });
  Promise.resolve({ data: { results: [], count: 0 } });

export const sendTextMessage = (data: { account_id: string; to: string; text: string }) =>
  // api.post('/messaging/messages/', {
  //   conversation: data.account_id,
  //   text: data.text,
  // });
  Promise.resolve({ 
    data: { 
      id: 'mock-' + Date.now(), 
      ...data, 
      from_number: data.account_id,
      to_number: data.to,
      direction: 'outbound' as const,
      message_type: 'text' as const,
      text_body: data.text,
      status: 'sent' as const,
      timestamp: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      account: data.account_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } 
  });

export const getConversationHistory = (accountId: string, phone: string, limit?: number) =>
  // api.get('/messaging/conversations/', { params: { account: accountId, phone, limit } });
  Promise.resolve({ data: { results: [], count: 0 } });

// Stats - NOTA: Endpoint não existe no backend atual
export const getMessageStats = (accountId: string, params?: any) =>
  // api.get('/messaging/stats/', { params: { ...params, account: accountId } });
  Promise.resolve({ data: { total: 0, sent: 0, received: 0 } });

// Webhook - NOTA: Endpoint não existe no backend atual
export const getWebhookStatus = () =>
  // api.get('/messaging/webhook-status/');
  Promise.resolve({ data: { status: 'unknown', url: '' } });

// Perfil
export const getBusinessProfile = (accountId: string) =>
  api.get(`/messaging/platform-accounts/${accountId}/profile/`);

export const whatsappService = {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  deactivateAccount,
  activateAccount,
  syncTemplates,
  rotateToken,
  getQRCode,
  getConnectionStatus,
  disconnectAccount,
  getTemplates,
  getMessages,
  sendTextMessage,
  getConversationHistory,
  getMessageStats,
  getWebhookStatus,
  getBusinessProfile,
};

export default whatsappService;
