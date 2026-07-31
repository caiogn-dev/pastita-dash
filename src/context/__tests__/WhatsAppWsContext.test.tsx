/**
 * Regressão do "Reconectando infinito" no inbox WhatsApp:
 * em dashboardMode o provider deve conectar em /ws/whatsapp/dashboard/
 * SEM depender de selectedAccount — antes getWsUrl exigia a conta e,
 * sem ela, connect() desistia sem nenhuma tentativa de rede.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

jest.mock('../../services/realtime', () => ({
  getWebSocketUrl: (path: string) => `wss://backend.test${path}`,
}));

jest.mock('../../services/conversations', () => ({
  conversationsService: { getConversation: jest.fn() },
}));

import { WhatsAppWsProvider } from '../WhatsAppWsContext';
import { useAuthStore } from '../../stores/authStore';
import { useAccountStore } from '../../stores/accountStore';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: unknown) => void) | null = null;
  sent: string[] = [];
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; }
}

describe('WhatsAppWsProvider (dashboardMode)', () => {
  const RealWebSocket = global.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    useAuthStore.setState({ token: 'test-token' });
    useAccountStore.setState({ selectedAccount: null });
  });

  afterEach(() => {
    (global as unknown as { WebSocket: unknown }).WebSocket = RealWebSocket;
  });

  it('conecta no endpoint dashboard sem selectedAccount', () => {
    render(
      <WhatsAppWsProvider dashboardMode>
        <div />
      </WhatsAppWsProvider>
    );

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/ws/whatsapp/dashboard/');
  });

  it('envia auth por primeira mensagem no onopen', () => {
    render(
      <WhatsAppWsProvider dashboardMode>
        <div />
      </WhatsAppWsProvider>
    );

    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();
    act(() => { socket.onopen?.(); });
    expect(socket.sent.map((s) => JSON.parse(s))).toContainEqual({ type: 'auth', token: 'test-token' });
  });
});
