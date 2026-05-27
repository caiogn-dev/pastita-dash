/**
 * WebSocket service
 * Use WebSocketContext for singleton connection
 * This file exports utility functions and stubs for backwards compatibility
 */
const _apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api/v1';
const BACKEND_BASE_URL = _apiUrl.replace(/\/api\/v1\/?$/, '');
const WS_BASE_URL = BACKEND_BASE_URL.replace(/^http/, 'ws');

/**
 * Get the WebSocket URL for a given path
 */
export const getWebSocketUrl = (path: string): string => {
  let wsHost = import.meta.env.VITE_WS_HOST?.replace(/^wss?:\/\//, '').replace(/\/+$/, '');

  if (!wsHost) {
    try {
      wsHost = new URL(WS_BASE_URL).host;
    } catch {
      try {
        wsHost = new URL(BACKEND_BASE_URL).host;
      } catch {
        wsHost = window.location.host;
      }
    }
  }

  const proto = wsHost.includes('railway') || wsHost.includes('vercel') || location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${wsHost}${path}`;
};

// Stub functions for backwards compatibility - do nothing
export const initializeWebSockets = (_token: string): void => {
  // No-op: WebSocket is now managed by WebSocketContext
};

export const disconnectWebSockets = (): void => {
  // No-op: WebSocket is now managed by WebSocketContext
};

// Stub objects for backwards compatibility
export const notificationWS = { connect: () => {}, disconnect: () => {}, on: () => () => {}, isConnected: () => false };
export const chatWS = { connect: () => {}, disconnect: () => {}, on: () => () => {}, isConnected: () => false };
export const dashboardWS = { connect: () => {}, disconnect: () => {}, on: () => () => {}, isConnected: () => false };
