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
import { dashboardService } from '../../services/dashboard';
import { getStoreSlugWithFallback } from '../useStore';
import type { DashboardCharts } from '../../types/dashboard';

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';

// A rota de charts aceita no máximo 90 dias; 1y é limitado a 90.
const PERIOD_TO_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 90 };

// Deriva a janela em dias de um DateRange (para a rota de charts, que só aceita
// `days`). Intervalo personalizado → diferença em dias (clampada 1-90).
const rangeToDays = (range: DateRange): number => {
  if (range.start_date && range.end_date) {
    const start = new Date(range.start_date).getTime();
    const end = new Date(range.end_date).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      const days = Math.ceil((end - start) / 86_400_000) + 1;
      return Math.max(1, Math.min(days, 90));
    }
  }
  return PERIOD_TO_DAYS[range.period ?? '30d'];
};

export function useDashboardStats(enabled: boolean) {
  return useQuery<DashboardStats>({
    queryKey: ['reports', 'dashboard-stats'],
    queryFn: () => reportsService.getDashboardStats(),
    enabled,
  });
}

export function useRevenueReport(range: DateRange, groupBy: GroupBy, enabled: boolean) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', range, groupBy],
    queryFn: () => reportsService.getRevenueReport({ ...range, group_by: groupBy }),
    enabled,
  });
}

export function useProductsReport(range: DateRange, enabled: boolean) {
  return useQuery<ProductsReport>({
    queryKey: ['reports', 'products', range],
    queryFn: () => reportsService.getProductsReport(range),
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

export function useCustomersReport(range: DateRange, enabled: boolean) {
  return useQuery<CustomersReport>({
    queryKey: ['reports', 'customers', range],
    queryFn: () => reportsService.getCustomersReport(range),
    enabled,
  });
}

// Aba Pedidos: séries por dia (contagem) + distribuição por status, do endpoint
// /core/dashboard/charts/. Escopo de loja via getStoreSlugWithFallback (mesmo
// padrão dos demais relatórios).
export function useOrdersCharts(range: DateRange, enabled: boolean) {
  const store = getStoreSlugWithFallback() || undefined;
  return useQuery<DashboardCharts>({
    queryKey: ['reports', 'orders-charts', range, store],
    queryFn: () => dashboardService.getCharts({ days: rangeToDays(range), store }),
    enabled,
  });
}
