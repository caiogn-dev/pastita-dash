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

// AudioContext não existe em jsdom; aqui interessa SE o alerta é disparado.
const mockPlayNotificationSound = jest.fn();
jest.mock('../useNotificationSound', () => ({
  useNotificationSound: () => ({
    playNotificationSound: mockPlayNotificationSound,
    playOrderSound: mockPlayNotificationSound,
    playSuccessSound: jest.fn(),
    stopAlert: jest.fn(),
    isAlertActive: false,
  }),
}));

beforeEach(() => {
  mockCreateWebSocket.mockClear();
  mockWs.connect.mockClear();
  mockWs.subscribe.mockClear();
  mockPlayNotificationSound.mockClear();
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

it('deriva a base do WS do apiUrl quando wsUrl vem vazia (VITE_WS_URL ausente no build)', async () => {
  renderHook(() =>
    useRealTimeOrders({
      enabled: true,
      apiUrl: 'https://backend.pastita.com.br/api/v1',
      wsUrl: undefined as unknown as string,
    }),
  );
  await waitFor(() => expect(mockCreateWebSocket).toHaveBeenCalledTimes(1));
  expect(mockCreateWebSocket).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'wss://backend.pastita.com.br' }),
  );
});

it('descarta wsUrl contaminada por "undefined" (template string com env ausente)', async () => {
  renderHook(() =>
    useRealTimeOrders({
      enabled: true,
      apiUrl: 'https://backend.pastita.com.br/api/v1',
      wsUrl: 'undefined/stores/s1/orders/',
    }),
  );
  await waitFor(() => expect(mockCreateWebSocket).toHaveBeenCalledTimes(1));
  expect(mockCreateWebSocket).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'wss://backend.pastita.com.br' }),
  );
});

it('não conecta quando não há token em lugar nenhum', async () => {
  useAuthStore.setState({ token: null, isAuthenticated: false });
  renderHook(() => useRealTimeOrders(config));
  // pequena espera para garantir que o efeito rodou e NÃO conectou
  await new Promise((r) => setTimeout(r, 20));
  expect(mockCreateWebSocket).not.toHaveBeenCalled();
});

// ── Alerta sonoro (PD-PERF-010) ──────────────────────────────────────────────
//
// O alerta inteiro — 2 ondas de 4 tons, repetição a cada 4s, auto-stop em 30s,
// Notification do browser — existia e NUNCA tocava: o board montava o hook com
// o retorno prefixado `_playNotificationSound`, o que também calava o lint, e
// nada chamava a função. Pedido novo entrava mudo e ficava parado na coluna
// "Novo" até alguém olhar para o monitor.
//
// Disparo religado na origem do evento (`order.created`), não no board — assim
// toca mesmo com o operador em outra tela do painel.

it('toca o alerta quando chega um pedido novo pelo WebSocket', async () => {
  renderHook(() => useRealTimeOrders(config));
  await waitFor(() => expect(mockWs.subscribe).toHaveBeenCalled());

  const inscricao = mockWs.subscribe.mock.calls.find(([evento]) => evento === 'order.created');
  expect(inscricao).toBeDefined();

  mockPlayNotificationSound.mockClear();
  inscricao![1]({ type: 'order.created' });

  expect(mockPlayNotificationSound).toHaveBeenCalledTimes(1);
});

it('não toca em atualização de pedido — só na criação', async () => {
  renderHook(() => useRealTimeOrders(config));
  await waitFor(() => expect(mockWs.subscribe).toHaveBeenCalled());

  mockPlayNotificationSound.mockClear();
  const atualizado = mockWs.subscribe.mock.calls.find(([e]) => e === 'order.updated');
  atualizado?.[1]({ type: 'order.updated', order: { id: 'o1' } });

  expect(mockPlayNotificationSound).not.toHaveBeenCalled();
});

// Cada pedido novo baixava a LISTA INTEIRA (`/stores/<id>/orders/`, 500 por
// página, ~500 KB) — 141 vezes em 7 dias, 73 MB. O evento traz o id: basta
// buscar aquele pedido (~3 KB) e pôr no topo.
describe('pedido novo busca só ele', () => {
  const pedido = (id: string) => ({ id, status: 'pending', updated_at: '2026-10-06T12:00:00Z' });
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useRootStore.setState({ orders: { s1: [pedido('antigo')] as any } });
  });

  const disparar = async (evento: string, payload: unknown) => {
    renderHook(() => useRealTimeOrders(config));
    await waitFor(() => expect(mockWs.subscribe).toHaveBeenCalled());
    mockWs.subscribe.mock.calls.find(([e]) => e === evento)![1](payload);
  };

  it('order.created pede /stores/orders/<id>/ e põe no topo', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => pedido('novo') });
    await disparar('order.created', { type: 'order.created', order_id: 'novo' });
    await waitFor(() => expect(useRootStore.getState().orders.s1.map((o: { id: string }) => o.id)).toEqual(['novo', 'antigo']));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://api/api/v1/stores/orders/novo/');
  });

  it('atualização de pedido fora da lista também busca só ele', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => pedido('fora') });
    await disparar('order.updated', { type: 'order.updated', order_id: 'fora', status: 'confirmed' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('http://api/api/v1/stores/orders/fora/');
  });

  it('se buscar o pedido falha, cai no refetch da lista', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [pedido('x')] }) });
    await disparar('order.created', { type: 'order.created', order_id: 'x' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('http://api/api/v1/stores/s1/orders/?quadro=1');
  });
});
