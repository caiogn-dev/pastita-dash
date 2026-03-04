import api from './api';

/**
 * Whatsapp Service - API V2 (compatibilidade com legado)
 * ATUALIZADO: Usando /messaging/messenger/accounts/ (backend migrado - 2026-03-04)
 * NOTA: Vários endpoints foram mockados pois não existem no backend atual
 */

// Contas
export const getAccounts = (params?: { store?: string }) =>
  api.get('/messaging/messenger/accounts/', { params });

export const getAccount = (id: string) =>
  api.get(`/messaging/messenger/accounts/${id}/`);

export const createAccount = (data: any) =>
  api.post('/messaging/messenger/accounts/', data);

export const updateAccount = (id: string, data: any) =>
  api.patch(`/messaging/messenger/accounts/${id}/`, data);

export const deleteAccount = (id: string) =>
  api.delete(`/messaging/messenger/accounts/${id}/`);

// Compatibilidade legado
export const deactivateAccount = (id: string) =>
  api.patch(`/messaging/messenger/accounts/${id}/`, { is_active: false });

export const activateAccount = (id: string) =>
  api.patch(`/messaging/messenger/accounts/${id}/`, { is_active: true });

export const syncTemplates = (id: string) =>
  api.post(`/messaging/messenger/accounts/${id}/sync-templates/`);

export const rotateToken = (id: string, token: string) =>
  api.post(`/messaging/messenger/accounts/${id}/rotate-token/`, { token });

// QR e Status
export const getQRCode = (accountId: string) =>
  api.get(`/messaging/messenger/accounts/${accountId}/qr/`);

export const getConnectionStatus = (accountId: string) =>
  api.get(`/messaging/messenger/accounts/${accountId}/status/`);

export const disconnectAccount = (accountId: string) =>
  api.post(`/messaging/messenger/accounts/${accountId}/disconnect/`);

// Templates - NOTA: Endpoint não existe no backend atual
export const getTemplates = (accountId: string) =>
  // api.get('/messaging/templates/', { params: { account: accountId } });
  Promise.resolve({ data: { results: [] } });

export const createTemplate = (data: any) =>
  // api.post('/messaging/templates/', data);
  Promise.resolve({ data: { id: 'mock', ...data } });

export const updateTemplate = (id: string, data: any) =>
  // api.patch(`/messaging/templates/${id}/`, data);
  Promise.resolve({ data: { id, ...data } });

export const deleteTemplate = (id: string) =>
  // api.delete(`/messaging/templates/${id}/`);
  Promise.resolve({ data: { success: true } });

// Mensagens - NOTA: Endpoint não existe no backend atual
export const sendMessage = (data: any) =>
  // api.post('/messaging/send/', data);
  Promise.resolve({
    data: {
      id: 'mock',
      ...data,
      status: 'sent',
      sent_at: new Date().toISOString()
    }
  });

export const sendTemplate = (data: any) =>
  // api.post('/messaging/send-template/', data);
  Promise.resolve({
    data: {
      id: 'mock-template',
      ...data,
      status: 'sent',
      sent_at: new Date().toISOString()
    }
  });

// Estatísticas - NOTA: Endpoint não existe no backend atual
export const getAccountStats = (accountId: string) =>
  // api.get(`/messaging/platform-accounts/${accountId}/stats/`);
  Promise.resolve({
    data: {
      total_messages: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      conversations: 0,
    }
  });

// Alias para compatibilidade com código legado - suporta diferentes assinaturas
export const getMessageStats = (accountIdOrParams?: any, dateParams?: any) => getAccountStats(accountIdOrParams as string);

export const getBillingInfo = (accountId: string) =>
  // api.get(`/messaging/platform-accounts/${accountId}/billing/`);
  Promise.resolve({
    data: {
      plan: 'free',
      credits: 0,
      used: 0,
      remaining: 0,
    }
  });

// Perfil do negócio - NOTA: Endpoint não existe no backend atual
export const getBusinessProfile = (accountId: string) =>
  Promise.resolve({
    data: {
      id: accountId,
      name: 'Business Profile',
      description: '',
      address: '',
      email: '',
      websites: [],
    }
  });

// Mensagens - aliases para compatibilidade
export const getMessages = (accountIdOrParams?: any, paramsOrPhone?: any, limit?: any) => {
  // Suporta diferentes chamadas: (accountId, phone, limit) ou (params)
  return Promise.resolve({ data: { results: [] } });
};

export const getConversationHistory = (conversationIdOrAccountId: any, phoneNumber?: any, limit?: any) => {
  // Suporta diferentes assinaturas
  return Promise.resolve({ data: { results: [] } });
};

export const sendTextMessage = sendMessage;

// Export
export default {
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
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendMessage,
  sendTextMessage, // alias de compatibilidade
  sendTemplate,
  getMessages,
  getConversationHistory,
  getBusinessProfile,
  getAccountStats,
  getMessageStats, // alias de compatibilidade
  getBillingInfo,
};
