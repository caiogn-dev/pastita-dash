/**
 * WebSocket utilities
 * 
 * NOTE: The old WebSocket service stubs have been removed.
 * Use WebSocketContext for managing WebSocket connections.
 * This file now only exports utility functions.
 */

/**
 * Get the WebSocket URL for a given path
 */
export const getWebSocketUrl = (path: string): string => {
  let wsHost = import.meta.env.VITE_WS_HOST;
  if (!wsHost) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    wsHost = apiUrl ? new URL(apiUrl).host : window.location.host;
  }
  const proto = wsHost.includes('railway') || wsHost.includes('vercel') || location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${wsHost}${path}`;
};
