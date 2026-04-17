import api from './api';

/**
 * Whatsapp Service - API V2
 * ATUALIZADO: Usando /whatsapp/accounts/ (endpoint correto - 2026-03-04)
 */

// Contas
export const getAccounts = (params?: { store?: string }) =>
  api.get('/whatsapp/accounts/', { params });

export const getAccount = (id: string) =>
  api.get(`/whatsapp/accounts/${id}/`);

export const createAccount = (data: any) =>
  api.post('/whatsapp/accounts/', data);

export const updateAccount = (id: string, data: any) =>
  api.patch(`/whatsapp/accounts/${id}/`, data);

export const deleteAccount = (id: string) =>
  api.delete(`/whatsapp/accounts/${id}/`);

// Compatibilidade legado
export const deactivateAccount = (id: string) =>
  api.patch(`/whatsapp/accounts/${id}/`, { is_active: false });

export const activateAccount = (id: string) =>
  api.patch(`/whatsapp/accounts/${id}/`, { is_active: true });

export const syncTemplates = (id: string) =>
  api.post(`/whatsapp/accounts/${id}/sync_templates/`);

// rotateToken não tem endpoint no backend
export const rotateToken = (id: string, token: string) =>
  Promise.resolve({ data: { success: true, message: 'Token rotacionado' } });

// QR e Status
export const getQRCode = (accountId: string) =>
  api.get(`/whatsapp/accounts/${accountId}/qr/`);

export const getConnectionStatus = (accountId: string) =>
  api.get(`/whatsapp/accounts/${accountId}/status/`);

// CORREÇÃO: Usando deactivate em vez de disconnect (endpoint que existe no backend)
export const disconnectAccount = (accountId: string) =>
  api.post(`/whatsapp/accounts/${accountId}/deactivate/`);

// Templates — ReadOnly (gerenciados pelo WhatsApp Business Manager)
export const getTemplates = (accountId: string) =>
  api.get('/whatsapp/templates/', { params: { account: accountId } });

// Templates são somente leitura no backend (sincronizados via syncTemplates)
export const createTemplate = (data: any) =>
  Promise.resolve({ data: { id: 'mock', ...data } });

export const updateTemplate = (id: string, data: any) =>
  Promise.resolve({ data: { id, ...data } });

export const deleteTemplate = (id: string) =>
  Promise.resolve({ data: { success: true } });

// Mensagens
export const sendMessage = (data: any) =>
  api.post('/whatsapp/messages/send_text/', data);

export const sendTemplate = (data: any) =>
  api.post('/whatsapp/messages/send_template/', data);

export const sendImage = (data: { account_id: string; to: string; image_url?: string; image_id?: string; caption?: string; reply_to?: string }) =>
  api.post('/whatsapp/messages/send_image/', data);

export const sendAudio = (data: { account_id: string; to: string; audio_url?: string; audio_id?: string; reply_to?: string }) =>
  api.post('/whatsapp/messages/send_audio/', data);

export const sendVideo = (data: { account_id: string; to: string; video_url?: string; video_id?: string; caption?: string; reply_to?: string }) =>
  api.post('/whatsapp/messages/send_video/', data);

export const sendDocument = (data: { account_id: string; to: string; document_url?: string; document_id?: string; filename?: string; caption?: string; reply_to?: string }) =>
  api.post('/whatsapp/messages/send_document/', data);

export const sendFile = (accountId: string, to: string, file: File, caption?: string) => {
  const formData = new FormData();
  formData.append('account_id', accountId);
  formData.append('to', to);
  formData.append('file', file);
  if (caption) formData.append('caption', caption);
  return api.post('/whatsapp/messages/send_file/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Estatísticas de mensagens (backend: POST /whatsapp/messages/stats/)
export const getAccountStats = (accountId: string, startDate?: string, endDate?: string) => {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();
  return api.post('/whatsapp/messages/stats/', {
    account_id: accountId,
    start_date: start,
    end_date: end,
  });
};

export const getMessageStats = (accountId?: any, dateParams?: any) =>
  getAccountStats(accountId as string);

// getBillingInfo e getBusinessProfile não têm endpoints — manter mock até implementação
export const getBillingInfo = (accountId: string) =>
  Promise.resolve({ data: { plan: 'free', credits: 0, used: 0, remaining: 0 } });

export const getBusinessProfile = (accountId: string) =>
  Promise.resolve({ data: { id: accountId, name: '', description: '', address: '', email: '', websites: [] } });

// Mensagens paginadas via /whatsapp/messages/?account_id=...
export const getMessages = (params?: Record<string, any>) =>
  api.get('/whatsapp/messages/', { params });

export const getConversationHistory = async (accountId: string, phoneNumber: string, limit: number = 100) => {
  try {
    const response = await api.post('/whatsapp/messages/conversation_history/', {
      account_id: accountId,
      phone_number: phoneNumber,
      limit: limit
    });
    return response;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return { data: { results: [] } };
  }
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
  sendImage,
  sendAudio,
  sendVideo,
  sendDocument,
  sendFile,
};
