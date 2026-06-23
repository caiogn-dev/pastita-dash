import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ordersService } from '../../../services/orders';
import { usePaymentsOrders } from '../usePaymentsOrders';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedEnvelope: (data: unknown) => data,
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const paginated = (results: unknown[], count = results.length) => ({
  count,
  next: null,
  previous: null,
  results,
});

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('usePaymentsOrders', () => {
  afterEach(() => jest.restoreAllMocks());

  it('busca pedidos paginados ordenados por -created_at, sem filtro', async () => {
    const spy = jest
      .spyOn(ordersService, 'getOrders')
      .mockResolvedValue(paginated([{ id: 'o1' }], 73) as any);

    const { result } = renderHook(() => usePaymentsOrders('store-1', 1, null), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toEqual([{ id: 'o1' }]);
    expect(result.current.data?.count).toBe(73);
    expect(spy).toHaveBeenCalledWith({
      store: 'store-1',
      ordering: '-created_at',
      page: 1,
    });
  });

  it('envia payment_status quando há filtro (server-side)', async () => {
    const spy = jest
      .spyOn(ordersService, 'getOrders')
      .mockResolvedValue(paginated([]) as any);

    const { result } = renderHook(() => usePaymentsOrders('store-1', 2, 'paid'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      store: 'store-1',
      ordering: '-created_at',
      page: 2,
      payment_status: 'paid',
    });
  });

  it('NÃO envia page_size (fim do over-fetch de 500)', async () => {
    const spy = jest
      .spyOn(ordersService, 'getOrders')
      .mockResolvedValue(paginated([]) as any);

    renderHook(() => usePaymentsOrders('store-1', 1, null), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).not.toHaveProperty('page_size');
  });

  it('deduplica: mesmos params chamam getOrders uma vez', async () => {
    const spy = jest
      .spyOn(ordersService, 'getOrders')
      .mockResolvedValue(paginated([{ id: 'o1' }]) as any);

    const wrapper = makeWrapper();
    const a = renderHook(() => usePaymentsOrders('store-1', 1, 'pending'), { wrapper });
    const b = renderHook(() => usePaymentsOrders('store-1', 1, 'pending'), { wrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('não busca quando storeId é undefined (enabled: false)', async () => {
    const spy = jest.spyOn(ordersService, 'getOrders').mockResolvedValue(paginated([]) as any);

    const { result } = renderHook(() => usePaymentsOrders(undefined, 1, null), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });
});
