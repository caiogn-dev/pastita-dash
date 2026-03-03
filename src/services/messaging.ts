/**
 * Messaging Service - API endpoints para o novo backend
 */
import api from './api';

// Conversations
export const getConversations = (params?: { store?: string }) => 
  api.get('/messaging/conversations/', { params });
export const getConversation = (id: string) => api.get(`/messaging/conversations/${id}/`);
export const createConversation = (data: any) => api.post('/messaging/conversations/', data);

// Messages
export const getMessages = (params?: { conversation?: string }) => 
  api.get('/messaging/messages/', { params });
export const sendMessage = (data: any) => api.post('/messaging/messages/', data);

// Export
export const messagingService = {
  conversations: {
    list: getConversations,
    get: getConversation,
    create: createConversation,
  },
  messages: {
    list: getMessages,
    send: sendMessage,
  },
};

export default messagingService;
