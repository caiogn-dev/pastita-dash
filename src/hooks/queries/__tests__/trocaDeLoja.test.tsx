/**
 * Trocar de loja não pode deixar a lista da loja anterior na tela enquanto a
 * nova carrega: `keepPreviousData` puro mostrava os clientes/pedidos da loja A
 * sob o nome da loja B. Mudar página/filtro dentro da mesma loja continua
 * mantendo a tabela (sem piscar).
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetOrders = jest.fn();
jest.mock('../../../services/orders', () => ({
  ordersService: { getOrders: (...a: unknown[]) => mockGetOrders(...a) },
}));
import { usePaymentsOrders } from '../usePaymentsOrders';
import { manterDaMesmaLoja } from '../../../utils/manterDaMesmaLoja';

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const W: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return W;
};

const adiavel = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};

describe('usePaymentsOrders — troca de loja', () => {
  beforeEach(() => mockGetOrders.mockReset());

  it('não mostra pedidos da loja A enquanto a loja B carrega', async () => {
    const lojaB = adiavel<{ results: string[] }>();
    mockGetOrders.mockImplementation(({ store }: { store: string }) =>
      store === 'a' ? Promise.resolve({ results: ['pedido-da-A'] }) : lojaB.promise,
    );
    const { result, rerender } = renderHook(
      ({ loja }) => usePaymentsOrders(loja, 1, null),
      { wrapper: wrapper(), initialProps: { loja: 'a' } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ results: ['pedido-da-A'] }));

    rerender({ loja: 'b' });
    expect(result.current.data).toBeUndefined();

    await act(async () => { lojaB.resolve({ results: ['pedido-da-B'] }); });
    await waitFor(() => expect(result.current.data).toEqual({ results: ['pedido-da-B'] }));
  });

  it('na mesma loja, trocar de página mantém a tabela anterior', async () => {
    const pagina2 = adiavel<{ results: string[] }>();
    mockGetOrders.mockImplementation(({ page }: { page: number }) =>
      page === 1 ? Promise.resolve({ results: ['p1'] }) : pagina2.promise,
    );
    const { result, rerender } = renderHook(
      ({ pagina }) => usePaymentsOrders('a', pagina, null),
      { wrapper: wrapper(), initialProps: { pagina: 1 } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ results: ['p1'] }));
    rerender({ pagina: 2 });
    expect(result.current.data).toEqual({ results: ['p1'] });
    await act(async () => { pagina2.resolve({ results: ['p2'] }); });
  });
});

describe('manterDaMesmaLoja', () => {
  it('mantém o anterior só quando a loja da chave anterior é a atual', () => {
    const f = manterDaMesmaLoja<string>('b', (k) => k[1]);
    expect(f('dado', { queryKey: ['x', 'b'] } as never)).toBe('dado');
    expect(f('dado', { queryKey: ['x', 'a'] } as never)).toBeUndefined();
    expect(f(undefined, undefined)).toBeUndefined();
  });
});
