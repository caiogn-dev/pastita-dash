/**
 * Hook for real-time WhatsApp message updates via WebSocket
 * 
 * Connects to: ws/whatsapp/{accountId}/ or ws/whatsapp/dashboard/
 * 
 * Events received:
 * - message_received: New inbound message
 * - message_sent: Outbound message confirmation
 * - status_updated: Message status change (sent, delivered, read)
 * - typing: Typing indicator
 * - conversation_updated: Conversation changes
 * - error: API errors
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { getWebSocketUrl } from '../services/websocket';

// Types
export interface WhatsAppMessage {
  id: string;
  whatsapp_message_id: string;
  conversation_id?: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  from_number: string;
  to_number: string;
  text_body: string;
  content: Record<string, unknown> | string;
  media_id?: string;
  media_url?: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  // Campos adicionais para compatibilidade com Message
  timestamp?: string;
  account?: string;
  updated_at?: string;
}

export interface WhatsAppContact {
  wa_id: string;
  name: string;
}

export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  contact_name: string;
  wa_id?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  status: string;
  mode: string;
  created_at: string;
}

export interface MessageReceivedEvent {
  type: 'message_received';
  message: WhatsAppMessage;
  conversation_id?: string;
  contact?: WhatsAppContact;
}

export interface MessageSentEvent {
  type: 'message_sent';
  message: WhatsAppMessage;
  conversation_id?: string;
}

export interface StatusUpdatedEvent {
  type: 'status_updated';
  message_id: string;
  whatsapp_message_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export interface TypingEvent {
  type: 'typing';
  conversation_id: string;
  is_typing: boolean;
}

export interface ConversationUpdatedEvent {
  type: 'conversation_updated';
  conversation: WhatsAppConversation;
}

export interface ErrorEvent {
  type: 'error';
  error_code: string;
  error_message: string;
  message_id?: string;
}

type WhatsAppEvent = 
  | MessageReceivedEvent 
  | MessageSentEvent 
  | StatusUpdatedEvent 
  | TypingEvent 
  | ConversationUpdatedEvent 
  | ErrorEvent
  | { type: 'pong' }
  | { type: 'connection_established'; account_id?: string; accounts?: string[]; message?: string }
  | { type: 'subscribed'; conversation_id?: string }
  | { type: 'unsubscribed'; conversation_id?: string }
  | { type: 'read_receipt_sent'; message_ids?: string[] };

interface UseWhatsAppWSOptions {
  accountId?: string;
  dashboardMode?: boolean;
  onMessageReceived?: (event: MessageReceivedEvent) => void;
  onMessage?: (message: WhatsAppMessage) => void;
  onMessageSent?: (event: MessageSentEvent) => void;
  onStatusUpdated?: (event: StatusUpdatedEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  enabled?: boolean;
}

interface UseWhatsAppWSReturn {
  isConnected: boolean;
  connectionError: string | null;
  retry: () => void;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: (conversationId: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  sendMessage: (phoneNumber: string, text: string) => Promise<void>;
}

// Export the type for external use
export type { UseWhatsAppWSReturn };

export function useWhatsAppWS(options: UseWhatsAppWSOptions = {}): UseWhatsAppWSReturn {
  const { token } = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const pingTimer = useRef<number | undefined>(undefined);
  const attempts = useRef(0);
  const isConnecting = useRef(false);
  const opts = useRef(options);
  opts.current = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    accountId,
    dashboardMode = false,
    enabled = true,
  } = options;

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    if (!token) return null;
    if (dashboardMode) {
      return getWebSocketUrl('/ws/whatsapp/dashboard/');
    }

    if (!accountId) return null;
    return getWebSocketUrl(`/ws/whatsapp/${accountId}/`);
  }, [token, accountId, dashboardMode]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as WhatsAppEvent & { type: string };

      if (data.type === 'pong') return;
      if (data.type === 'connection_established') return;
      if (data.type === 'subscribed' || data.type === 'unsubscribed') return;
      if (data.type === 'read_receipt_sent') return;

      switch (data.type) {
        case 'message_received':
          opts.current.onMessageReceived?.(data as MessageReceivedEvent);
          opts.current.onMessage?.(data.message);
          break;
        case 'message_sent':
          opts.current.onMessageSent?.(data as MessageSentEvent);
          break;
        case 'status_updated':
          opts.current.onStatusUpdated?.(data as StatusUpdatedEvent);
          break;
        case 'typing':
          opts.current.onTyping?.(data as TypingEvent);
          break;
        case 'conversation_updated':
          opts.current.onConversationUpdated?.(data as ConversationUpdatedEvent);
          break;
        case 'error':
          opts.current.onError?.(data as ErrorEvent);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('[WhatsApp WS] Parse error:', err);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const url = getWsUrl();
    if (!url || !enabled) return;
    if (isConnecting.current) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    // Close existing connection
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
      ws.current = null;
    }

    isConnecting.current = true;

    try {
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        // First-message auth — token never in URL
        if (token) {
          socket.send(JSON.stringify({ type: 'auth', token }));
        }
        // connection_established from server triggers connected state
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as { type: string };
          if (data.type === 'connection_established') {
            isConnecting.current = false;
            setIsConnected(true);
            setConnectionError(null);
            attempts.current = 0;
            opts.current.onConnectionChange?.(true);
            if (pingTimer.current) window.clearInterval(pingTimer.current);
            pingTimer.current = window.setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
              }
            }, 25000);
            return;
          }
        } catch { /* fall through to handleMessage */ }
        handleMessage(event);
      };

      socket.onclose = (e) => {
        isConnecting.current = false;
        setIsConnected(false);
        opts.current.onConnectionChange?.(false);

        if (pingTimer.current) {
          window.clearInterval(pingTimer.current);
          pingTimer.current = undefined;
        }

        // Reconnect on abnormal close
        if (e.code !== 1000 && attempts.current < 10 && enabled) {
          const delay = Math.min(1000 * Math.pow(1.5, attempts.current), 30000);
          setConnectionError('Reconectando...');

          reconnectTimer.current = window.setTimeout(() => {
            attempts.current++;
            connect();
          }, delay);
        } else if (attempts.current >= 10) {
          setConnectionError('Conexão perdida. Atualize a página.');
        }
      };

      socket.onerror = () => {
        isConnecting.current = false;
      };
    } catch (err) {
      console.error('[WhatsApp WS] Connection error:', err);
      isConnecting.current = false;
    }
  }, [getWsUrl, enabled, handleMessage]);

  // Subscribe to a specific conversation (for typing indicators)
  const subscribeToConversation = useCallback((conversationId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe_conversation',
        conversation_id: conversationId,
      }));
    }
  }, []);

  // Unsubscribe from a conversation
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'unsubscribe_conversation',
        conversation_id: conversationId,
      }));
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping,
      }));
    }
  }, []);

  // Send message via API
  const sendMessage = useCallback(async (phoneNumber: string, text: string) => {
    await api.post('/whatsapp/messages/send_text/', {
      to: phoneNumber,
      text: text,
    });
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && (accountId || dashboardMode)) {
      connect();
    }

    // Reconnect on tab visibility change
    const onVisible = () => {
      if (document.visibilityState === 'visible' && enabled) {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
          attempts.current = 0;
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (pingTimer.current) window.clearInterval(pingTimer.current);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close(1000);
        ws.current = null;
      }
    };
  }, [connect, enabled, accountId, dashboardMode]);

  const retry = useCallback(() => {
    attempts.current = 0;
    setConnectionError(null);
    connect();
  }, [connect]);

  const returnValue = {
    isConnected,
    connectionError,
    retry,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
    sendMessage,
  };

  return returnValue as UseWhatsAppWSReturn;
}

export default useWhatsAppWS;
