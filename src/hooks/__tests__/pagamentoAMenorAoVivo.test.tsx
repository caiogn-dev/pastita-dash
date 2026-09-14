// Pagamento a menor era mudo: o backend travava o pedido em `processing` e o
// painel não sabia. Agora chega `order.payment_partial` com quanto entrou e
// quanto falta — vira aviso na tela e atualiza o card sem F5.
import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeOrders } from '../useRealTimeOrders';
import { applyOrderEventToOrders } from '../orderRealtimeEvents';
import { useRootStore } from '../../stores/rootStore';
import { useAuthStore } from '../../stores/authStore';
import type { StoreOrder } from '../../services/storesApi';

const mockWs = {
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock('../../services/websocket', () => ({
  createWebSocket: () => mockWs,
  clearWebSocketInstance: jest.fn(),
}));
jest.mock('../useNotificationSound', () => ({
  useNotificationSound: () => ({ playNotificationSound: jest.fn() }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockToast = jest.requireMock('react-hot-toast').default as { success: jest.Mock; error: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: 'tok', isAuthenticated: true });
  useRootStore.setState({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stores: [{ id: 's1', slug: 'loja-1' } as any],
    selectedStoreId: 's1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders: { s1: [{ id: 'o1', order_number: 'CE-1', status: 'pending', payment_status: 'pending', total: 43.28 } as any] },
  });
});

it('assina order.payment_partial e avisa quanto falta', async () => {
  renderHook(() => useRealTimeOrders({ enabled: true, apiUrl: 'http://api/api/v1', wsUrl: 'ws://ws' }));
  await waitFor(() =>
    expect(mockWs.subscribe).toHaveBeenCalledWith('order.payment_partial', expect.any(Function)),
  );
  const handler = mockWs.subscribe.mock.calls.find((c) => c[0] === 'order.payment_partial')![1];
  handler({
    type: 'order.payment_partial', order_id: 'o1', order_number: 'CE-1',
    payment_status: 'processing', amount_paid: '38.95', amount_due: '4.33',
  });
  expect(mockToast.error).toHaveBeenCalledTimes(1);
  expect(String(mockToast.error.mock.calls[0][0]).replace(/\s/g, ' ')).toContain('falta R$ 4,33');
  const pedido = useRootStore.getState().orders.s1[0] as StoreOrder;
  expect(pedido.amount_due).toBe(4.33);
  expect(pedido.payment_status).toBe('processing');
});

it('o patch leva amount_paid/amount_due quando o evento traz', () => {
  const lista = [{ id: 'o1', status: 'pending' } as StoreOrder];
  const next = applyOrderEventToOrders(lista, { order_id: 'o1', amount_paid: '10.00', amount_due: '5.00' })!;
  expect(next[0].amount_paid).toBe(10);
  expect(next[0].amount_due).toBe(5);
});
