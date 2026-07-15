// src/components/orders/newOrder/__tests__/useNewOrderWizard.suppress.test.ts
// Pedido de balcão: "Não notificar o cliente" manda suppress_notifications no payload.
import { renderHook, act } from '@testing-library/react';

const calculateDeliveryFee = jest.fn();
const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useNewOrderWizard } from '../useNewOrderWizard';

beforeEach(() => {
  jest.clearAllMocks();
  calculateDeliveryFee.mockResolvedValue({ fee: 0, distance_km: 0, duration_minutes: 0 });
  createOrder.mockResolvedValue({ order_number: '#1011' });
});

function setupBase(result: { current: ReturnType<typeof useNewOrderWizard> }) {
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Maria', phone_number: '63999990000' } as never);
    result.current.setDeliveryMethod('pickup');
    result.current.addToCart({ id: 'p1', price: 1000, name: 'X' } as never);
  });
}

test('marcado, payload inclui suppress_notifications: true', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  setupBase(result);
  act(() => { result.current.setSuppressNotifications(true); });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder).toHaveBeenCalledWith(
    expect.objectContaining({ suppress_notifications: true })
  );
});

test('desmarcado (default), payload nao envia suppress_notifications', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  setupBase(result);
  await act(async () => { await result.current.handleSubmit(); });
  const arg = (createOrder as jest.Mock).mock.calls[0][0];
  expect(arg.suppress_notifications).toBeUndefined();
});

test('reset desmarca o checkbox', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => { result.current.setSuppressNotifications(true); });
  act(() => { result.current.reset(); });
  expect(result.current.suppressNotifications).toBe(false);
});
