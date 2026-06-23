import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as storesApi from '../../../services/storesApi';
import { useProducts } from '../useProducts';

// storesApi importa ./api, que usa import.meta.env (jest não parseia). Mockamos
// o módulo api para que apenas getProducts (espiado abaixo) seja exercitado.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedEnvelope: (data: unknown) => data,
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const paginated = (results: unknown[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useProducts', () => {
  afterEach(() => jest.restoreAllMocks());

  it('busca os produtos da loja e expõe os dados', async () => {
    const spy = jest
      .spyOn(storesApi, 'getProducts')
      .mockResolvedValue(paginated([{ id: 'p1', name: 'Pizza' }]) as any);

    const { result } = renderHook(() => useProducts('store-1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toEqual([{ id: 'p1', name: 'Pizza' }]);
    expect(spy).toHaveBeenCalledWith({ store: 'store-1', page_size: 500 });
  });

  it('deduplica: dois hooks com a mesma loja chamam getProducts uma vez', async () => {
    const spy = jest
      .spyOn(storesApi, 'getProducts')
      .mockResolvedValue(paginated([{ id: 'p1', name: 'Pizza' }]) as any);

    const wrapper = makeWrapper();
    const a = renderHook(() => useProducts('store-1'), { wrapper });
    const b = renderHook(() => useProducts('store-1'), { wrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('não busca quando storeId é undefined (enabled: false)', async () => {
    const spy = jest.spyOn(storesApi, 'getProducts').mockResolvedValue(paginated([]) as any);

    const { result } = renderHook(() => useProducts(undefined), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });
});
