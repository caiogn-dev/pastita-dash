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

  // As duas condições juntas, num waitFor só.
  //
  // Separadas, o teste falhava ~1 vez a cada 3 execuções da suíte completa (e
  // nunca sozinho): a lista vive no store do zustand, que é externo ao React e
  // notifica os assinantes assim que `setOrders` roda — ANTES do
  // `setLoading(false)` do `finally`. Existe, portanto, um render legítimo com
  // 1 pedido e `loading: true`, e o `waitFor` de uma condição só saía
  // exatamente nele.
  //
  // O estado intermediário não é bug: é o que permite revalidar mostrando os
  // dados antigos. Quem estava errado era a asserção, ao supor que os dois
  // acontecem no mesmo render.
  await waitFor(() => {
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });
});

test('sets error when the fetch fails', async () => {
  getOrders.mockRejectedValue(new Error('boom'));
  const { result } = renderHook(() => useStoreOrdersFeed());
  await waitFor(() => expect(result.current.error).toBeTruthy());
});
