import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as storesApi from '../../../services/storesApi';
import { useCustomerStats } from '../useCustomerStats';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedEnvelope: (data: unknown) => data,
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const STATS = { total: 120, active: 80, with_orders: 50, total_revenue: '12345.67' };

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useCustomerStats', () => {
  afterEach(() => jest.restoreAllMocks());

  it('busca os KPIs agregados do backend passando o store', async () => {
    const spy = jest
      .spyOn(storesApi, 'getCustomerStats')
      .mockResolvedValue(STATS as any);

    const { result } = renderHook(() => useCustomerStats('store-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(STATS);
    expect(spy).toHaveBeenCalledWith({ store: 'store-1' });
  });

  it('deduplica: dois hooks da mesma loja chamam getCustomerStats uma vez', async () => {
    const spy = jest
      .spyOn(storesApi, 'getCustomerStats')
      .mockResolvedValue(STATS as any);

    const wrapper = makeWrapper();
    const a = renderHook(() => useCustomerStats('store-1'), { wrapper });
    const b = renderHook(() => useCustomerStats('store-1'), { wrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('não busca quando storeId é undefined (enabled: false)', async () => {
    const spy = jest.spyOn(storesApi, 'getCustomerStats').mockResolvedValue(STATS as any);

    const { result } = renderHook(() => useCustomerStats(undefined), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });
});
