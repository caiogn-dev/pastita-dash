import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reportsService, type DateRange } from '../../../services/reports';
import { useRootStore } from '../../../stores/rootStore';
import type { Store } from '../../../services/storesApi';
import {
  useDashboardStats,
  useRevenueReport,
  useProductsReport,
  useStockReport,
  useCustomersReport,
} from '../useReports';

// Os relatórios são buscados sempre escopados à loja SELECIONADA
// (reportsService.* injeta `store` da loja atual). Se a queryKey não carregar a
// loja — e não for REATIVA à troca de loja — o React Query mantém o cache de
// OUTRA loja ao trocar de tenant com a página montada: vazamento de dados. Estes
// testes trocam a loja no rootStore real SOB O MESMO render e exigem que a query
// re-chaveie e busque o dado da nova loja.
jest.mock('../../../services/reports', () => ({
  __esModule: true,
  reportsService: {
    getDashboardStats: jest.fn(),
    getRevenueReport: jest.fn(),
    getProductsReport: jest.fn(),
    getStockReport: jest.fn(),
    getCustomersReport: jest.fn(),
  },
}));
jest.mock('../../../services/dashboard', () => ({
  __esModule: true,
  dashboardService: { getCharts: jest.fn() },
}));
// storeConfig usa `import.meta.env` (não transformado pelo ts-jest fora de
// mobile/whatsapp). O caminho de fallback dele nem é exercido aqui (sempre há
// loja selecionada), então um stub simples basta.
jest.mock('../../../config/storeConfig', () => ({
  __esModule: true,
  DEFAULT_STORE_SLUG: null,
  resolveStoreSlug: (...candidates: Array<string | null | undefined>) =>
    candidates.find((c) => c != null) ?? null,
}));

const RANGE: DateRange = { period: '30d' };
const STORE_A = { id: 'id-A', slug: 'loja-A', name: 'Loja A' } as unknown as Store;
const STORE_B = { id: 'id-B', slug: 'loja-B', name: 'Loja B' } as unknown as Store;

// staleTime: Infinity torna o vazamento determinístico: se a queryKey não mudar
// ao trocar de loja, a 2ª loja recebe o cache da 1ª SEM refetch. Com a key reativa
// escopada por loja, a troca vira cache-miss e busca o dado da nova loja.
function sharedClientWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

interface IsolationCase {
  name: string;
  serviceFn: jest.Mock;
  useHook: () => { data: unknown; isSuccess: boolean };
}

describe('useReports — isolamento de cache por loja (multi-tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useRootStore.setState({ stores: [STORE_A, STORE_B], selectedStoreId: STORE_A.id });
    });
  });

  afterEach(() => {
    act(() => {
      useRootStore.setState({ stores: [], selectedStoreId: null });
    });
  });

  const cases: IsolationCase[] = [
    {
      name: 'useDashboardStats',
      serviceFn: reportsService.getDashboardStats as jest.Mock,
      useHook: () => useDashboardStats(true),
    },
    {
      name: 'useRevenueReport',
      serviceFn: reportsService.getRevenueReport as jest.Mock,
      useHook: () => useRevenueReport(RANGE, 'day', true),
    },
    {
      name: 'useProductsReport',
      serviceFn: reportsService.getProductsReport as jest.Mock,
      useHook: () => useProductsReport(RANGE, true),
    },
    {
      name: 'useStockReport',
      serviceFn: reportsService.getStockReport as jest.Mock,
      useHook: () => useStockReport(true),
    },
    {
      name: 'useCustomersReport',
      serviceFn: reportsService.getCustomersReport as jest.Mock,
      useHook: () => useCustomersReport(RANGE, true),
    },
  ];

  it.each(cases)(
    '$name re-chaveia ao trocar de loja SOB o mesmo render (sem vazar o tenant anterior)',
    async ({ serviceFn, useHook }) => {
      serviceFn
        .mockResolvedValueOnce({ marker: 'loja-A' })
        .mockResolvedValueOnce({ marker: 'loja-B' });

      const wrapper = sharedClientWrapper();
      const { result } = renderHook(useHook, { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ marker: 'loja-A' });

      // Troca de loja no seletor (rootStore) com a página AINDA montada: a query
      // precisa reagir e buscar o dado da nova loja — nunca manter o cache da 1ª.
      act(() => {
        useRootStore.setState({ selectedStoreId: STORE_B.id });
      });

      await waitFor(() => expect(result.current.data).toEqual({ marker: 'loja-B' }));
      expect(serviceFn).toHaveBeenCalledTimes(2);
    },
  );
});
