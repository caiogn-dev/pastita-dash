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
import { dashboardService } from '../../services/dashboard';
import { getStoreSlugWithFallback } from '../useStore';
import type { DashboardCharts } from '../../types/dashboard';

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';

// A rota de charts aceita no máximo 90 dias; 1y é limitado a 90.
const PERIOD_TO_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 90 };

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

// Aba Pedidos: séries por dia (contagem) + distribuição por status, do endpoint
// /core/dashboard/charts/. Escopo de loja via getStoreSlugWithFallback (mesmo
// padrão dos demais relatórios).
export function useOrdersCharts(period: Period, enabled: boolean) {
  const store = getStoreSlugWithFallback() || undefined;
  return useQuery<DashboardCharts>({
    queryKey: ['reports', 'orders-charts', period, store],
    queryFn: () => dashboardService.getCharts({ days: PERIOD_TO_DAYS[period], store }),
    enabled,
  });
}
