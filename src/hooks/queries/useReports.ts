/**
 * Hooks de relatórios (AnalyticsPage).
 *
 * Antes a página baixava os 5 relatórios num único Promise.all sob um `loading`
 * só, e QUALQUER mudança de controle (inclusive `groupBy`, que só afeta o
 * faturamento) refazia os 5 fetches. As abas já são renderizadas
 * condicionalmente, mas o fetch não era.
 *
 * Aqui cada relatório vira um useQuery próprio:
 *  - `enabled` liga o fetch só quando a aba ativa precisa daquele dado;
 *  - a queryKey carrega apenas os parâmetros que aquele relatório realmente usa,
 *    então trocar `groupBy` invalida só o de faturamento, e `stock`/`dashboard`
 *    (que não dependem de período) ficam em cache ao navegar entre abas.
 */
import { useQuery } from '@tanstack/react-query';
import {
  reportsService,
  RevenueReport,
  ProductsReport,
  StockReport,
  CustomersReport,
  DashboardStats,
  DateRange,
} from '../../services/reports';
import { getStoreSlugWithFallback } from '../useStore';

type GroupBy = 'day' | 'week' | 'month';

// TODAS as queryKeys carregam a loja selecionada — sem isso, trocar de loja
// no seletor mostrava o cache da loja anterior (dados "zerados"/errados).
const storeKey = () => getStoreSlugWithFallback() || 'no-store';

export function useDashboardStats(enabled: boolean) {
  return useQuery<DashboardStats>({
    queryKey: ['reports', 'dashboard-stats', storeKey()],
    queryFn: () => reportsService.getDashboardStats(),
    enabled,
  });
}

export function useRevenueReport(range: DateRange, groupBy: GroupBy, enabled: boolean) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', storeKey(), range, groupBy],
    queryFn: () => reportsService.getRevenueReport({ ...range, group_by: groupBy }),
    enabled,
  });
}

export function useProductsReport(range: DateRange, enabled: boolean) {
  return useQuery<ProductsReport>({
    queryKey: ['reports', 'products', storeKey(), range],
    queryFn: () => reportsService.getProductsReport(range),
    enabled,
  });
}

export function useStockReport(enabled: boolean) {
  return useQuery<StockReport>({
    queryKey: ['reports', 'stock', storeKey()],
    queryFn: () => reportsService.getStockReport(),
    enabled,
  });
}

export function useCustomersReport(range: DateRange, enabled: boolean) {
  return useQuery<CustomersReport>({
    queryKey: ['reports', 'customers', storeKey(), range],
    queryFn: () => reportsService.getCustomersReport(range),
    enabled,
  });
}

// Hook genérico dos relatórios de analytics (BI Fase 1). A queryKey inclui o
// path e o range; `enabled` segue o padrão das abas (só busca quando visível).
export function useAnalyticsReport<T>(path: string, range: DateRange, enabled: boolean) {
  return useQuery<T>({
    queryKey: ['reports', 'analytics', path, storeKey(), range],
    queryFn: () => reportsService.getAnalyticsReport<T>(path, range),
    enabled,
  });
}
