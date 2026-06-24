/**
 * AnalyticsPage - Relatórios (sem Chakra UI)
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toCsv, downloadCsv } from '../../utils/csv';
import { Card, Button, Badge, StatCard } from '../../components/ui';
import { reportsService } from '../../services/reports';
import {
  useDashboardStats,
  useRevenueReport,
  useProductsReport,
  useStockReport,
  useCustomersReport,
} from '../../hooks/queries/useReports';

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';
type TabValue = 'overview' | 'revenue' | 'products' | 'stock' | 'customers';

// ─── KpiCard ─────────────────────────────────────────────────────────────────
// Adapta as KPIs ao StatCard canônico (tone via tokens) preservando os dados
// existentes (variação % vs ontem e legenda) dentro do `sub`.

type KpiTone = 'default' | 'brand' | 'warning';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  tone?: KpiTone;
  loading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, change, tone = 'default', loading }) => {
  const isPositive = (change ?? 0) >= 0;
  const changeText =
    change !== undefined ? `${isPositive ? '+' : ''}${change.toFixed(1)}% vs ontem` : undefined;
  const sub = [subtitle, changeText].filter(Boolean).join(' · ') || undefined;

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted-token">{title}</p>
        <div className="mt-1 h-8 w-24 animate-pulse bg-surface-2 rounded" />
      </Card>
    );
  }

  return <StatCard label={title} value={value} sub={sub} tone={tone} />;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const TABS: { value: TabValue; label: string }[] = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'revenue', label: 'Faturamento' },
  { value: 'products', label: 'Produtos' },
  { value: 'stock', label: 'Estoque' },
  { value: 'customers', label: 'Clientes' },
];

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: '1 ano', value: '1y' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [period, setPeriod] = useState<Period>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [errorDismissed, setErrorDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Cada relatório só é buscado quando a aba ativa precisa dele. A queryKey
  // (em useReports) garante que trocar groupBy só refaz o faturamento e que
  // navegar entre abas reaproveita o cache.
  const needsRevenue = activeTab === 'overview' || activeTab === 'revenue';
  const needsProducts = activeTab === 'overview' || activeTab === 'products';
  const needsCustomers = activeTab === 'overview' || activeTab === 'customers';

  const statsQuery = useDashboardStats(activeTab === 'overview');
  const revenueQuery = useRevenueReport(period, groupBy, needsRevenue);
  const productsQuery = useProductsReport(period, needsProducts);
  const stockQuery = useStockReport(activeTab === 'stock');
  const customersQuery = useCustomersReport(period, needsCustomers);

  const dashboardStats = statsQuery.data ?? null;
  const revenueReport = revenueQuery.data ?? null;
  const productsReport = productsQuery.data ?? null;
  const stockReport = stockQuery.data ?? null;
  const customersReport = customersQuery.data ?? null;

  // Loadings granulares: cada seção mostra spinner só enquanto o SEU dado carrega.
  const statsLoading = statsQuery.isLoading;
  const revenueLoading = revenueQuery.isLoading;
  const productsLoading = productsQuery.isLoading;
  const stockLoading = stockQuery.isLoading;
  const customersLoading = customersQuery.isLoading;

  // Erro derivado de qualquer query ativa (sem setState no render).
  const hasError = [
    statsQuery, revenueQuery, productsQuery, stockQuery, customersQuery,
  ].some(q => q.isError);
  const error = hasError && !errorDismissed
    ? 'Erro ao carregar relatórios. Tente novamente.'
    : null;

  const activeTabLoading =
    activeTab === 'revenue' ? revenueLoading
    : activeTab === 'products' ? productsLoading
    : activeTab === 'stock' ? stockLoading
    : activeTab === 'customers' ? customersLoading
    : statsLoading;
  const anyFetching = [
    statsQuery, revenueQuery, productsQuery, stockQuery, customersQuery,
  ].some(q => q.isFetching);

  // "Atualizar" reativa o banner de erro e invalida os relatórios em cache.
  const loadData = () => {
    setErrorDismissed(false);
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const handleExportOrders = async () => {
    try {
      const blob = await reportsService.exportOrdersCSV({ period });
      reportsService.downloadBlob(blob, `pedidos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch { /* silent */ }
  };

  // Exports CSV client-side a partir dos dados já carregados (pt-BR/Excel)
  const stamp = () => format(new Date(), 'yyyy-MM-dd');

  const handleExportRevenue = () => {
    downloadCsv(toCsv(revenueReport?.data || [], [
      { key: 'period', label: 'Período' },
      { key: 'total_revenue', label: 'Faturamento' },
      { key: 'order_count', label: 'Pedidos' },
      { key: 'avg_order_value', label: 'Ticket Médio' },
      { key: 'total_delivery_fees', label: 'Taxas de Entrega' },
      { key: 'total_discounts', label: 'Descontos' },
    ]), `faturamento_${stamp()}.csv`);
  };

  const handleExportProducts = () => {
    downloadCsv(toCsv(productsReport?.top_products || [], [
      { key: 'product_name', label: 'Produto' },
      { key: 'total_quantity', label: 'Qtd Vendida' },
      { key: 'order_count', label: 'Pedidos' },
      { key: 'total_revenue', label: 'Receita' },
      { key: 'current_stock', label: 'Estoque Atual' },
    ]), `produtos_${stamp()}.csv`);
  };

  const handleExportStock = () => {
    const rows = [
      ...(stockReport?.low_stock_products || []).map((p) => ({ ...p, situacao: 'Estoque baixo' })),
      ...(stockReport?.out_of_stock_products || []).map((p) => ({ ...p, stock_quantity: 0, situacao: 'Sem estoque' })),
    ];
    downloadCsv(toCsv(rows, [
      { key: 'name', label: 'Produto' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Categoria' },
      { key: 'stock_quantity', label: 'Estoque' },
      { key: 'situacao', label: 'Situação' },
    ]), `estoque_${stamp()}.csv`);
  };

  const handleExportCustomers = () => {
    downloadCsv(toCsv(customersReport?.top_customers || [], [
      { key: 'name', label: 'Cliente' },
      { key: 'phone', label: 'Telefone' },
      { key: 'email', label: 'Email' },
      { key: 'order_count', label: 'Pedidos' },
      { key: 'total_spent', label: 'Total Gasto' },
      { key: 'avg_order_value', label: 'Ticket Médio' },
    ]), `clientes_${stamp()}.csv`);
  };

  const exportForTab: Partial<Record<TabValue, () => void>> = {
    revenue: handleExportRevenue,
    products: handleExportProducts,
    stock: handleExportStock,
    customers: handleExportCustomers,
  };

  // ─── Overview Tab ──────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <KpiCard title="Faturamento Hoje" value={formatCurrency(dashboardStats?.today.revenue || 0)} change={dashboardStats?.today.revenue_change_percent} tone="brand" loading={statsLoading} />
        <KpiCard title="Pedidos Hoje" value={dashboardStats?.today.orders || 0} subtitle={`${dashboardStats?.week.orders || 0} esta semana`} loading={statsLoading} />
        <KpiCard title="Pedidos Pendentes" value={dashboardStats?.alerts.pending_orders || 0} subtitle="Aguardando ação" tone="warning" loading={statsLoading} />
        <KpiCard title="Estoque Baixo" value={dashboardStats?.alerts.low_stock_products || 0} subtitle="Produtos para repor" tone="warning" loading={statsLoading} />
      </div>

      {/* Revenue chart */}
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-fg-token">Faturamento</h2>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-sm rounded border transition-colors ${groupBy === g ? 'bg-brand text-white border-brand' : 'border-border-token text-fg-muted-token hover:bg-surface-2'}`}
              >
                {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
        {revenueLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueReport?.data || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#166534" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tickFormatter={(v) => { try { return format(parseISO(v), 'dd/MM', { locale: ptBR }); } catch { return v; } }} stroke="#6b7280" fontSize={12} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} stroke="#6b7280" fontSize={12} />
              <RechartsTooltip
                formatter={(v) => [formatCurrency(Number(v) || 0), 'Faturamento']}
                labelFormatter={(l) => { try { return format(parseISO(String(l)), "dd 'de' MMMM", { locale: ptBR }); } catch { return String(l); } }}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="total_revenue" stroke="#166534" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Bottom two columns */}
      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
        {/* Top Products */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-fg-token">Produtos Mais Vendidos</h2>
            <Badge tone="neutral">Top {productsReport?.top_products.length || 0}</Badge>
          </div>
          {productsLoading ? <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-token">
                  <th className="pb-2 text-left text-fg-muted-token font-medium">Produto</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium">Qtd</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {productsReport?.top_products.slice(0, 5).map((p, i) => (
                  <tr key={p.product_id || i} className="border-b border-border-token last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {i < 3 && <StarIcon className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`} style={{ fill: 'currentColor' }} />}
                        <span className="truncate max-w-[150px] text-fg-token">{p.product_name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium text-fg-token">{p.total_quantity}</td>
                    <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Customer Stats */}
        <Card>
          <h2 className="text-lg font-semibold text-fg-token mb-4">Clientes</h2>
          {customersLoading ? <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /> : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{customersReport?.summary.total_customers || 0}</p>
                  <p className="text-sm text-fg-muted-token">Total de Clientes</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{customersReport?.summary.retention_rate || 0}%</p>
                  <p className="text-sm text-fg-muted-token">Taxa de Retenção</p>
                </div>
              </div>
              <div className="border-t border-border-token pt-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-fg-muted-token">Novos Clientes</span>
                  <span className="text-sm font-medium text-fg-token">{customersReport?.summary.new_customers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-fg-muted-token">Clientes Recorrentes</span>
                  <span className="text-sm font-medium text-fg-token">{customersReport?.summary.returning_customers || 0}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  // ─── Stock Tab ─────────────────────────────────────────────────────────────

  const renderStock = () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <KpiCard title="Total de Produtos" value={stockReport?.summary.total_products || 0} loading={stockLoading} />
        <KpiCard title="Estoque Baixo" value={stockReport?.summary.low_stock_count || 0} subtitle={`Limite: ${stockReport?.summary.low_stock_threshold || 10} unidades`} tone="warning" loading={stockLoading} />
        <KpiCard title="Sem Estoque" value={stockReport?.summary.out_of_stock_count || 0} subtitle="Reposição urgente" tone="warning" loading={stockLoading} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-fg-token mb-4">Produtos com Estoque Baixo</h2>
        {stockLoading ? (
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        ) : stockReport?.low_stock_products.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">Estoque OK!</p>
              <p className="text-sm text-green-700 dark:text-green-400">Todos os produtos estão com estoque adequado!</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-token">
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Produto</th>
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">SKU</th>
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Categoria</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Estoque</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Preço</th>
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockReport?.low_stock_products.map((p) => (
                  <tr key={p.id} className="border-b border-border-token last:border-0">
                    <td className="py-2 px-2 font-medium text-fg-token">{p.name}</td>
                    <td className="py-2 px-2 text-fg-muted-token">{p.sku || '-'}</td>
                    <td className="py-2 px-2"><Badge tone="neutral">{p.category || 'Sem categoria'}</Badge></td>
                    <td className="py-2 px-2 text-right">
                      <Badge tone={p.stock_quantity === 0 ? 'danger' : 'warning'}>{p.stock_quantity || 0}</Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-fg-token">{formatCurrency(p.price)}</td>
                    <td className="py-2 px-2">
                      <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  const renderRevenue = () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <KpiCard title="Faturamento" value={formatCurrency(revenueReport?.summary.total_revenue || 0)} tone="brand" loading={revenueLoading} />
        <KpiCard title="Pedidos" value={revenueReport?.summary.total_orders || 0} loading={revenueLoading} />
        <KpiCard title="Ticket Médio" value={formatCurrency(revenueReport?.summary.avg_order_value || 0)} loading={revenueLoading} />
        <KpiCard title="Taxas de Entrega" value={formatCurrency(revenueReport?.summary.total_delivery_fees || 0)} loading={revenueLoading} />
      </div>
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-fg-token">Faturamento por Período</h2>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-sm rounded border transition-colors ${groupBy === g ? 'bg-brand text-white border-brand' : 'border-border-token text-fg-muted-token hover:bg-surface-2'}`}
              >
                {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
        {revenueLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueReport?.data || []}>
              <defs>
                <linearGradient id="colorRevenueTab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#166534" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tickFormatter={(v) => { try { return format(parseISO(v), 'dd/MM', { locale: ptBR }); } catch { return v; } }} stroke="#6b7280" fontSize={12} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} stroke="#6b7280" fontSize={12} />
              <RechartsTooltip formatter={(v) => [formatCurrency(Number(v) || 0), 'Faturamento']} />
              <Area type="monotone" dataKey="total_revenue" stroke="#166534" strokeWidth={2} fill="url(#colorRevenueTab)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );

  const renderProducts = () => (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-fg-token">Performance de Produtos</h2>
        <Badge tone="neutral">{productsReport?.top_products.length || 0} produtos</Badge>
      </div>
      {productsLoading ? (
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-token">
                <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Produto</th>
                <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Qtd</th>
                <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Pedidos</th>
                <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Receita</th>
                <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Estoque</th>
              </tr>
            </thead>
            <tbody>
              {(productsReport?.top_products || []).map((p, i) => (
                <tr key={p.product_id || `${p.product_name}-${i}`} className="border-b border-border-token last:border-0">
                  <td className="py-2 px-2 font-medium text-fg-token">{p.product_name}</td>
                  <td className="py-2 px-2 text-right text-fg-token">{p.total_quantity}</td>
                  <td className="py-2 px-2 text-right text-fg-token">{p.order_count}</td>
                  <td className="py-2 px-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(p.total_revenue)}</td>
                  <td className="py-2 px-2 text-right text-fg-muted-token">{p.current_stock ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const renderCustomers = () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <KpiCard title="Clientes" value={customersReport?.summary.total_customers || 0} tone="brand" loading={customersLoading} />
        <KpiCard title="Novos" value={customersReport?.summary.new_customers || 0} loading={customersLoading} />
        <KpiCard title="Recorrentes" value={customersReport?.summary.returning_customers || 0} loading={customersLoading} />
        <KpiCard title="Retenção" value={`${customersReport?.summary.retention_rate || 0}%`} loading={customersLoading} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-fg-token mb-4">Melhores Clientes</h2>
        {customersLoading ? (
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-token">
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Cliente</th>
                  <th className="pb-2 text-left text-fg-muted-token font-medium px-2">Contato</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Pedidos</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Total</th>
                  <th className="pb-2 text-right text-fg-muted-token font-medium px-2">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {(customersReport?.top_customers || []).map((c, i) => (
                  <tr key={c.email || c.phone || `${c.name}-${i}`} className="border-b border-border-token last:border-0">
                    <td className="py-2 px-2 font-medium text-fg-token">{c.name || 'Cliente'}</td>
                    <td className="py-2 px-2 text-fg-muted-token">{c.phone || c.email || '-'}</td>
                    <td className="py-2 px-2 text-right text-fg-token">{c.order_count}</td>
                    <td className="py-2 px-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(c.total_spent)}</td>
                    <td className="py-2 px-2 text-right text-fg-token">{formatCurrency(c.avg_order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg-token">Relatórios</h1>
          <p className="text-sm text-fg-muted-token mt-0.5">Análise completa do seu negócio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="text-sm border border-border-token rounded px-3 py-1.5 bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button variant="outline" onClick={handleExportOrders} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
            Exportar pedidos
          </Button>
          {exportForTab[activeTab] && (
            <Button
              variant="outline"
              onClick={exportForTab[activeTab]}
              disabled={activeTabLoading}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              Exportar aba (CSV)
            </Button>
          )}
          <Button variant="ghost" onClick={loadData} disabled={anyFetching} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
          <button onClick={() => setErrorDismissed(true)} className="text-sm text-red-600 hover:underline">Fechar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-token">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.value
                ? 'border-brand text-brand'
                : 'border-transparent text-fg-muted-token hover:text-fg-token'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' && renderStock()}
      {activeTab === 'revenue' && renderRevenue()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'customers' && renderCustomers()}
      {activeTab === 'overview' && renderOverview()}
    </div>
  );
};

export default AnalyticsPage;
