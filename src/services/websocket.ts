/**
 * WebSocket service
 * Use WebSocketContext for singleton connection
 * This file exports utility functions and stubs for backwards compatibility
 */

/**
 * Get the WebSocket URL for a given path.
 *
 * Priority: VITE_WS_URL (full base URL) → VITE_WS_HOST (host only) → derived from VITE_API_URL → window.location.host
 */
export const getWebSocketUrl = (path: string): string => {
  // 1. Full WS base URL, e.g. wss://backend.pastita.com.br
  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (wsUrl) {
    return `${wsUrl.replace(/\/$/, '')}${path}`;
  }

  // 2. Host-only override
  let wsHost = import.meta.env.VITE_WS_HOST as string | undefined;
  if (!wsHost) {
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || '';
    wsHost = apiUrl ? new URL(apiUrl).host : window.location.host;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
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
