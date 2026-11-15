import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as storesApi from '../../../services/storesApi';
import { useCustomers } from '../useCustomers';

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

describe('useCustomers', () => {
  afterEach(() => jest.restoreAllMocks());

  it('busca clientes paginados passando store/search/page server-side', async () => {
    const spy = jest
      .spyOn(storesApi, 'getCustomers')
      .mockResolvedValue(paginated([{ id: 'c1', user_name: 'Ana' }], 42) as any);

    const { result } = renderHook(() => useCustomers('store-1', 'ana', 2), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toEqual([{ id: 'c1', user_name: 'Ana' }]);
    expect(result.current.data?.count).toBe(42);
    expect(spy).toHaveBeenCalledWith({
      store: 'store-1',
      search: 'ana',
      page: 2,
      page_size: 30,
    });
  });

  it('omite search quando vazio (envia undefined)', async () => {
    const spy = jest
      .spyOn(storesApi, 'getCustomers')
      .mockResolvedValue(paginated([]) as any);

    const { result } = renderHook(() => useCustomers('store-1', '', 1), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      store: 'store-1',
      search: undefined,
      page: 1,
      page_size: 30,
    });
  });

  it('deduplica: mesmos params chamam getCustomers uma vez', async () => {
    const spy = jest
      .spyOn(storesApi, 'getCustomers')
      .mockResolvedValue(paginated([{ id: 'c1' }]) as any);

    const wrapper = makeWrapper();
    const a = renderHook(() => useCustomers('store-1', 'x', 1), { wrapper });
    const b = renderHook(() => useCustomers('store-1', 'x', 1), { wrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('não busca quando storeId é undefined (enabled: false)', async () => {
    const spy = jest.spyOn(storesApi, 'getCustomers').mockResolvedValue(paginated([]) as any);

    const { result } = renderHook(() => useCustomers(undefined, '', 1), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });

  it('trocar de loja não deixa os clientes da loja anterior na tela', async () => {
    let liberaB!: (v: unknown) => void;
    jest.spyOn(storesApi, 'getCustomers').mockImplementation(((p: { store?: string }) =>
      p.store === 'a'
        ? Promise.resolve(paginated([{ id: 'ca', user_name: 'Cliente da A' }]))
        : new Promise((r) => { liberaB = r; })) as never);

    const { result, rerender } = renderHook(({ loja }) => useCustomers(loja, '', 1), {
      wrapper: makeWrapper(),
      initialProps: { loja: 'a' },
    });
    await waitFor(() => expect(result.current.data?.results).toHaveLength(1));

    rerender({ loja: 'b' });
    expect(result.current.data).toBeUndefined();

    await act(async () => { liberaB(paginated([{ id: 'cb' }])); });
    await waitFor(() => expect(result.current.data?.results).toEqual([{ id: 'cb' }]));
  });
});
