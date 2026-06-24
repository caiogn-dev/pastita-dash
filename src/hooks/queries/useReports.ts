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
} from '../../services/reports';

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';

export function useDashboardStats(enabled: boolean) {
  return useQuery<DashboardStats>({
    queryKey: ['reports', 'dashboard-stats'],
    queryFn: () => reportsService.getDashboardStats(),
    enabled,
  });
}

export function useRevenueReport(period: Period, groupBy: GroupBy, enabled: boolean) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', period, groupBy],
    queryFn: () => reportsService.getRevenueReport({ period, group_by: groupBy }),
    enabled,
  });
}

export function useProductsReport(period: Period, enabled: boolean) {
  return useQuery<ProductsReport>({
    queryKey: ['reports', 'products', period],
    queryFn: () => reportsService.getProductsReport({ period }),
    enabled,
  });
}

export function useStockReport(enabled: boolean) {
  return useQuery<StockReport>({
    queryKey: ['reports', 'stock'],
    queryFn: () => reportsService.getStockReport(),
    enabled,
  });
}

export function useCustomersReport(period: Period, enabled: boolean) {
  return useQuery<CustomersReport>({
    queryKey: ['reports', 'customers', period],
    queryFn: () => reportsService.getCustomersReport({ period }),
    enabled,
  });
}
