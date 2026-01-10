import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  notificationWS,
  dashboardWS,
  chatWS,
  getWebSocketUrl,
} from '../services/websocket';

type MessageHandler = (data: unknown) => void;

export const useNotificationWebSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());

  useEffect(() => {
    if (isAuthenticated && token) {
      notificationWS.connect(getWebSocketUrl('/ws/notifications/'), token);
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [isAuthenticated, token]);

  const subscribe = useCallback((event: string, handler: MessageHandler) => {
    handlersRef.current.set(event, handler);
    return notificationWS.on(event, handler);
  }, []);

  const unsubscribe = useCallback((event: string) => {
    const handler = handlersRef.current.get(event);
    if (handler) {
      notificationWS.off(event, handler);
      handlersRef.current.delete(event);
    }
  }, []);

  return {
    subscribe,
    unsubscribe,
    isConnected: notificationWS.isConnected(),
  };
};

export const useDashboardWebSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());

  useEffect(() => {
    if (isAuthenticated && token) {
      dashboardWS.connect(getWebSocketUrl('/ws/dashboard/'), token);
    }

    return () => {
      // Don't disconnect on unmount
    };
  }, [isAuthenticated, token]);

  const subscribe = useCallback((event: string, handler: MessageHandler) => {
    handlersRef.current.set(event, handler);
    return dashboardWS.on(event, handler);
  }, []);

  const unsubscribe = useCallback((event: string) => {
    const handler = handlersRef.current.get(event);
    if (handler) {
      dashboardWS.off(event, handler);
      handlersRef.current.delete(event);
    }
  }, []);

  const subscribeToAccount = useCallback((accountId: string) => {
    dashboardWS.send({ type: 'subscribe_account', account_id: accountId });
  }, []);

  return {
    subscribe,
    unsubscribe,
    subscribeToAccount,
    isConnected: dashboardWS.isConnected(),
  };
};

export const useChatWebSocket = (conversationId: string | null) => {
  const { token, isAuthenticated } = useAuthStore();
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());

  useEffect(() => {
    if (isAuthenticated && token && conversationId) {
      chatWS.connect(getWebSocketUrl(`/ws/chat/${conversationId}/`), token);
    }

    return () => {
      if (conversationId) {
        chatWS.disconnect();
      }
    };
  }, [isAuthenticated, token, conversationId]);

  const subscribe = useCallback((event: string, handler: MessageHandler) => {
    handlersRef.current.set(event, handler);
    return chatWS.on(event, handler);
  }, []);

  const unsubscribe = useCallback((event: string) => {
    const handler = handlersRef.current.get(event);
    if (handler) {
      chatWS.off(event, handler);
      handlersRef.current.delete(event);
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    chatWS.send({ type: 'typing', is_typing: isTyping });
  }, []);

  const markAsRead = useCallback((messageId: string) => {
    chatWS.send({ type: 'read', message_id: messageId });
  }, []);

  return {
    subscribe,
    unsubscribe,
    sendTyping,
    markAsRead,
    isConnected: chatWS.isConnected(),
  };
};
