// src/hooks/__tests__/useRealTimeOrders.test.tsx
//
// Regressão: o WebSocket de pedidos ao vivo nunca conectava porque o hook lia
// o token de `useRootStore.auth.token` — store que NINGUÉM popula no login. O
// token vivo (persistido) mora em `useAuthStore`, igual aos demais hooks de WS
// (useInstagramWS / useMessengerWS). Com rootStore.auth.token sempre null, o
// early-return do useEffect impedia a conexão e o painel nunca recebia pedidos
// em tempo real.
import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeOrders } from '../useRealTimeOrders';
import { useRootStore } from '../../stores/rootStore';
import { useAuthStore } from '../../stores/authStore';

const mockWs = {
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};
const mockCreateWebSocket = jest.fn(() => mockWs);
jest.mock('../../services/websocket', () => ({
  createWebSocket: (cfg: unknown) => mockCreateWebSocket(cfg),
  clearWebSocketInstance: jest.fn(),
}));

beforeEach(() => {
  mockCreateWebSocket.mockClear();
  mockWs.connect.mockClear();
  // Estado realista pós-login: token vivo no authStore; rootStore.auth vazio
  // (como acontece em produção — ninguém chama useRootStore.setAuth no login).
  useAuthStore.setState({ token: 'tok-123', isAuthenticated: true });
  useRootStore.setState({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stores: [{ id: 's1', slug: 'loja-1' } as any],
    selectedStoreId: 's1',
    auth: { user: null, token: null },
  });
});

const config = { enabled: true, apiUrl: 'http://api/api/v1', wsUrl: 'ws://ws' };

it('conecta o WebSocket usando o token do authStore (não do rootStore.auth)', async () => {
  renderHook(() => useRealTimeOrders(config));
  await waitFor(() => expect(mockCreateWebSocket).toHaveBeenCalledTimes(1));
  expect(mockCreateWebSocket).toHaveBeenCalledWith(
    expect.objectContaining({ token: 'tok-123', storeSlug: 'loja-1', url: 'ws://ws' }),
  );
  expect(mockWs.connect).toHaveBeenCalled();
});

it('não conecta quando não há token em lugar nenhum', async () => {
  useAuthStore.setState({ token: null, isAuthenticated: false });
  renderHook(() => useRealTimeOrders(config));
  // pequena espera para garantir que o efeito rodou e NÃO conectou
  await new Promise((r) => setTimeout(r, 20));
  expect(mockCreateWebSocket).not.toHaveBeenCalled();
});
