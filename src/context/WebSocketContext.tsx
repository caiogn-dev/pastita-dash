/**
 * Global WebSocket Context - SINGLETON
 * Only ONE connection for the entire app
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

interface OrderEvent {
  type: string;
  order_id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  [key: string]: unknown;
}

type Callback = (data: OrderEvent) => void;

interface WSContextValue {
  isConnected: boolean;
  error: string | null;
  on: (event: string, cb: Callback) => () => void;
}

const WSContext = createContext<WSContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const listeners = useRef<Map<string, Set<Callback>>>(new Map());
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const pingTimer = useRef<NodeJS.Timeout>();
  const attempts = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emit = useCallback((event: string, data: OrderEvent) => {
    listeners.current.get(event)?.forEach(cb => cb(data));
    listeners.current.get('*')?.forEach(cb => cb(data));
  }, []);

  const connect = useCallback(() => {
    if (!token || ws.current?.readyState === WebSocket.OPEN) return;
    
    // Build URL
    let host = import.meta.env.VITE_WS_HOST;
    if (!host) {
      const api = import.meta.env.VITE_API_URL;
      host = api ? new URL(api).host : window.location.host;
    }
    const proto = host.includes('railway') || host.includes('vercel') || location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${host}/ws/stores/${STORE_SLUG}/orders/?token=${token}`;
    
    console.log('[WS] Connecting...');
    
    const socket = new WebSocket(url);
    ws.current = socket;
    
    socket.onopen = () => {
      console.log('[WS] Connected ✓');
      setIsConnected(true);
      setError(null);
      attempts.current = 0;
      
      // Ping every 25s
      pingTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('{"type":"ping"}');
        }
      }, 25000);
    };
    
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'pong' || data.type === 'connection_established') return;
        
        // Normalize event names
        const eventMap: Record<string, string> = {
          'order.created': 'order_created',
          'order.updated': 'order_updated', 
          'order.paid': 'payment_received',
        };
        emit(eventMap[data.type] || data.type, data);
      } catch {}
    };
    
    socket.onclose = (e) => {
      console.log('[WS] Closed:', e.code);
      setIsConnected(false);
      clearInterval(pingTimer.current);
      
      if (e.code !== 1000 && attempts.current < 10) {
        const delay = Math.min(1000 * Math.pow(1.5, attempts.current), 30000);
        setError('Reconectando...');
        reconnectTimer.current = setTimeout(() => {
          attempts.current++;
          connect();
        }, delay);
      }
    };
    
    socket.onerror = () => console.log('[WS] Error');
  }, [token, emit]);

  // Subscribe to events
  const on = useCallback((event: string, cb: Callback) => {
    if (!listeners.current.has(event)) {
      listeners.current.set(event, new Set());
    }
    listeners.current.get(event)!.add(cb);
    return () => { listeners.current.get(event)?.delete(cb); };
  }, []);

  useEffect(() => {
    connect();
    
    const onVisible = () => {
      if (document.visibilityState === 'visible' && ws.current?.readyState !== WebSocket.OPEN) {
        attempts.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(reconnectTimer.current);
      clearInterval(pingTimer.current);
      ws.current?.close(1000);
    };
  }, [connect]);

  return (
    <WSContext.Provider value={{ isConnected, error, on }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be inside WebSocketProvider');
  return ctx;
}
