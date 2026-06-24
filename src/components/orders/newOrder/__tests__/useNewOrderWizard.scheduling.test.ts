// src/components/orders/newOrder/__tests__/useNewOrderWizard.scheduling.test.ts
import { renderHook, act } from '@testing-library/react';

const calculateDeliveryFee = jest.fn();
const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useNewOrderWizard } from '../useNewOrderWizard';

beforeEach(() => {
  calculateDeliveryFee.mockResolvedValue({ fee: 0, distance_km: 0, duration_minutes: 0 });
  createOrder.mockResolvedValue({ order_number: '#1010' });
  jest.clearAllMocks();
  createOrder.mockResolvedValue({ order_number: '#1010' });
});

test('payload inclui scheduled_date/scheduled_time quando agendado', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Maria', phone_number: '63999990000' } as never);
    result.current.setDeliveryMethod('pickup');
    result.current.addToCart({ id: 'p1', price: 1000, name: 'X' } as never);
    result.current.setEnableScheduling(true);
    result.current.setScheduledDate('2999-01-15');
    result.current.setScheduledTime('16:00-17:00');
  });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder).toHaveBeenCalledWith(
    expect.objectContaining({ scheduled_date: '2999-01-15', scheduled_time: '16:00-17:00' })
  );
});

test('sem agendamento, payload nao envia scheduled_date', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Maria', phone_number: '63999990000' } as never);
    result.current.setDeliveryMethod('pickup');
    result.current.addToCart({ id: 'p1', price: 1000, name: 'X' } as never);
  });
  await act(async () => { await result.current.handleSubmit(); });
  const arg = (createOrder as jest.Mock).mock.calls[0][0];
  expect(arg.scheduled_date).toBeUndefined();
});
