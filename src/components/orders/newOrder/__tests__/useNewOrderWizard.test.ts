// src/components/orders/newOrder/__tests__/useNewOrderWizard.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';

const calculateDeliveryFee = jest.fn();
const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useNewOrderWizard } from '../useNewOrderWizard';

const PRODUCT = { id: 'p1', price: 20 } as never;

beforeEach(() => {
  calculateDeliveryFee.mockResolvedValue({ fee: 9, distance_km: 2.3, duration_minutes: 21 });
  createOrder.mockResolvedValue({ order_number: '#1009' });
});

test('canProceed gates step 0 on customer + valid phone', () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  expect(result.current.canProceed()).toBe(false);
  act(() => result.current.setCustomer({ id: '', name: 'Ana', phone_number: '63999990000', phone_number_edited: '63999990000', email: '' } as never));
  expect(result.current.canProceed()).toBe(true);
});

test('handleCalculateRoute stores the quote', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  await act(async () => { await result.current.handleCalculateRoute('Rua X, 100'); });
  expect(calculateDeliveryFee).toHaveBeenCalledWith('loja-1', 'Rua X, 100');
  expect(result.current.routeQuote).toEqual({ fee: 9, distance_km: 2.3, duration_minutes: 21 });
});

test('handleSubmit sends slug + delivery_fee from the quote and calls onCreated', async () => {
  const onCreated = jest.fn();
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1', onCreated }));
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Ana', phone_number: '63999990000', email: '' } as never);
    result.current.addToCart(PRODUCT);
    result.current.setFreeAddressText('Rua X, 100');
  });
  await act(async () => { await result.current.handleCalculateRoute('Rua X, 100'); });
  await act(async () => { await result.current.handleSubmit(); });
  const payload = (createOrder as jest.Mock).mock.calls[0][0];
  expect(payload.customer_email).toBeUndefined();
  expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 'loja-1', delivery_method: 'delivery', delivery_fee: 9,
    items: [{ product_id: 'p1', quantity: 1 }],
  }));
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
});
