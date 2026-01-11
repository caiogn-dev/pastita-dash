import { useEffect, useRef, useCallback, useState } from 'react';
import logger from '../services/logger';
import { useAuthStore } from '../stores/authStore';
import { AutomationWebSocketEvent } from '../types';

interface UseAutomationWSOptions {
  companyId?: string;
  onSessionCreated?: (data: unknown) => void;
  onSessionUpdated?: (data: unknown) => void;
  onMessageSent?: (data: unknown) => void;
  onWebhookReceived?: (data: unknown) => void;
  onAutomationError?: (data: unknown) => void;
  onStatsUpdate?: (data: unknown) => void;
  onScheduledMessageSent?: (data: unknown) => void;
  onReportGenerated?: (data: unknown) => void;
}

export function useAutomationWS(options: UseAutomationWSOptions = {}) {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AutomationWebSocketEvent | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/automation/?token=${token}`;
  }, [token]);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        logger.info('Automation WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Subscribe to company if provided
        if (options.companyId) {
          ws.send(JSON.stringify({
            type: 'subscribe_company',
            company_id: options.companyId,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AutomationWebSocketEvent;
          setLastEvent(data);

          switch (data.type) {
            case 'session_created':
              options.onSessionCreated?.(data);
              break;
            case 'session_updated':
              options.onSessionUpdated?.(data);
              break;
            case 'message_sent':
              options.onMessageSent?.(data);
              break;
            case 'webhook_received':
              options.onWebhookReceived?.(data);
              break;
            case 'automation_error':
              options.onAutomationError?.(data);
              break;
            case 'stats_update':
              options.onStatsUpdate?.(data);
              break;
            case 'scheduled_message_sent':
              options.onScheduledMessageSent?.(data);
              break;
            case 'report_generated':
              options.onReportGenerated?.(data);
              break;
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        logger.info('Automation WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        logger.error('Automation WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
    }
  }, [token, getWebSocketUrl, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const subscribeToCompany = useCallback((companyId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_company',
        company_id: companyId,
      }));
    }
  }, []);

  const unsubscribeFromCompany = useCallback((companyId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_company',
        company_id: companyId,
      }));
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    connect();

    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  // Subscribe to company when it changes
  useEffect(() => {
    if (options.companyId && isConnected) {
      subscribeToCompany(options.companyId);
    }
  }, [options.companyId, isConnected, subscribeToCompany]);

  return {
    isConnected,
    lastEvent,
    subscribeToCompany,
    unsubscribeFromCompany,
    reconnect: connect,
    disconnect,
  };
}

export default useAutomationWS;
