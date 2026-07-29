import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reportsService, type DateRange } from '../../../services/reports';
import { getStoreSlugWithFallback } from '../../useStore';
import {
  useDashboardStats,
  useRevenueReport,
  useProductsReport,
  useStockReport,
  useCustomersReport,
} from '../useReports';

// Os relatórios são buscados sempre escopados à loja SELECIONADA
// (reportsService.* injeta `store: getStoreSlugWithFallback()`). Se a queryKey
// não carregar a loja, o React Query serve o cache de OUTRA loja ao trocar de
// tenant — vazamento de dados entre lojas. Estes testes travam a propriedade:
// cada loja tem uma entrada de cache própria.
jest.mock('../../useStore', () => ({
  getStoreSlugWithFallback: jest.fn(),
}));
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

const mockStore = getStoreSlugWithFallback as jest.Mock;
const RANGE: DateRange = { period: '30d' };

// staleTime: Infinity torna o vazamento determinístico: se a queryKey de duas
// lojas colidir, a 2ª loja recebe o cache da 1ª SEM refetch. Com a queryKey
// escopada por loja, a 2ª loja é um cache-miss e busca o próprio dado.
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
    '$name não vaza o cache da loja anterior ao trocar de tenant',
    async ({ serviceFn, useHook }) => {
      serviceFn
        .mockResolvedValueOnce({ marker: 'loja-A' })
        .mockResolvedValueOnce({ marker: 'loja-B' });

      const wrapper = sharedClientWrapper();

      mockStore.mockReturnValue('loja-A');
      const a = renderHook(useHook, { wrapper });
      await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
      expect(a.result.current.data).toEqual({ marker: 'loja-A' });

      // Troca de loja: a 2ª loja NÃO pode receber o dado cacheado da 1ª.
      mockStore.mockReturnValue('loja-B');
      const b = renderHook(useHook, { wrapper });
      await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
      expect(b.result.current.data).toEqual({ marker: 'loja-B' });
      expect(serviceFn).toHaveBeenCalledTimes(2);
    },
  );
});
