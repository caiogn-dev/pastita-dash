// src/mobile/__tests__/useStoreOrdersFeed.test.tsx
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => undefined }));
const getOrders = jest.fn();
jest.mock('../../services/storesApi', () => ({ getOrders: (...a: unknown[]) => getOrders(...a) }));

import { useRootStore } from '../../stores/rootStore';
import { useStoreOrdersFeed } from '../useStoreOrdersFeed';

const ORDER = { id: 'o1', order_number: '#1', status: 'pending', customer_name: 'Ana', total: 10, items: [], created_at: '2026-06-19T12:00:00Z' };

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  useRootStore.setState({ selectedStoreId: 's1', orders: {} } as never);
});

test('loads orders for the active store and exposes them', async () => {
  const { result } = renderHook(() => useStoreOrdersFeed());
  await waitFor(() => expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({ store: 's1', page_size: 50 })));
  await waitFor(() => expect(result.current.orders).toHaveLength(1));
  expect(result.current.loading).toBe(false);
});

test('sets error when the fetch fails', async () => {
  getOrders.mockRejectedValue(new Error('boom'));
  const { result } = renderHook(() => useStoreOrdersFeed());
  await waitFor(() => expect(result.current.error).toBeTruthy());
});
