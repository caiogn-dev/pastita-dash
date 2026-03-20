/**
 * AnalyticsPage - Relatórios (sem Chakra UI)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TruckIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, Button, Badge } from '../../components/common';
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
type TabValue = 'overview' | 'revenue' | 'products' | 'stock' | 'customers';

// ─── StatCard ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, change, icon: Icon, iconClass = 'text-blue-500', loading }) => {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4 flex justify-between items-start hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-fg-muted">{title}</span>
        {loading ? (
          <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        ) : (
          <span className="text-2xl font-bold text-fg-primary">{value}</span>
        )}
        {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive
              ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              : <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-xs text-fg-muted">vs ontem</span>
          </div>
        )}
      </div>
      <div className={`p-2 rounded-xl bg-bg-secondary ${iconClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [productsReport, setProductsReport] = useState<ProductsReport | null>(null);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [customersReport, setCustomersReport] = useState<CustomersReport | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, revenue, products, stock, customers] = await Promise.all([
        reportsService.getDashboardStats(),
        reportsService.getRevenueReport({ period, group_by: groupBy }),
        reportsService.getProductsReport({ period }),
        reportsService.getStockReport(),
        reportsService.getCustomersReport({ period }),
      ]);
      setDashboardStats(stats);
      setRevenueReport(revenue);
      setProductsReport(products);
      setStockReport(stock);
      setCustomersReport(customers);
    } catch {
      setError('Erro ao carregar relatórios. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [period, groupBy]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportOrders = async () => {
    try {
      const blob = await reportsService.exportOrdersCSV({ period });
      reportsService.downloadBlob(blob, `pedidos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    } catch { /* silent */ }
  };

  // ─── Overview Tab ──────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento Hoje" value={formatCurrency(dashboardStats?.today.revenue || 0)} change={dashboardStats?.today.revenue_change_percent} icon={CurrencyDollarIcon} iconClass="text-green-500" loading={loading} />
        <StatCard title="Pedidos Hoje" value={dashboardStats?.today.orders || 0} subtitle={`${dashboardStats?.week.orders || 0} esta semana`} icon={ShoppingCartIcon} iconClass="text-blue-500" loading={loading} />
        <StatCard title="Pedidos Pendentes" value={dashboardStats?.alerts.pending_orders || 0} subtitle="Aguardando ação" icon={TruckIcon} iconClass="text-orange-500" loading={loading} />
        <StatCard title="Estoque Baixo" value={dashboardStats?.alerts.low_stock_products || 0} subtitle="Produtos para repor" icon={ExclamationTriangleIcon} iconClass="text-red-500" loading={loading} />
      </div>

      {/* Revenue chart */}
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-fg-primary">Faturamento</h2>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${groupBy === g ? 'bg-brand-600 text-white border-brand-600' : 'border-border-primary text-fg-secondary hover:bg-bg-hover'}`}
              >
                {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueReport?.data || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
              <Area type="monotone" dataKey="total_revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-fg-primary">Produtos Mais Vendidos</h2>
            <Badge variant="subtle">Top {productsReport?.top_products.length || 0}</Badge>
          </div>
          {loading ? <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="pb-2 text-left text-fg-muted font-medium">Produto</th>
                  <th className="pb-2 text-right text-fg-muted font-medium">Qtd</th>
                  <th className="pb-2 text-right text-fg-muted font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {productsReport?.top_products.slice(0, 5).map((p, i) => (
                  <tr key={p.product_id || i} className="border-b border-border-primary last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {i < 3 && <StarIcon className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`} style={{ fill: 'currentColor' }} />}
                        <span className="truncate max-w-[150px] text-fg-primary">{p.product_name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium text-fg-primary">{p.total_quantity}</td>
                    <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Customer Stats */}
        <Card>
          <h2 className="text-lg font-semibold text-fg-primary mb-4">Clientes</h2>
          {loading ? <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /> : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{customersReport?.summary.total_customers || 0}</p>
                  <p className="text-sm text-fg-muted">Total de Clientes</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{customersReport?.summary.retention_rate || 0}%</p>
                  <p className="text-sm text-fg-muted">Taxa de Retenção</p>
                </div>
              </div>
              <div className="border-t border-border-primary pt-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-fg-muted">Novos Clientes</span>
                  <span className="text-sm font-medium text-fg-primary">{customersReport?.summary.new_customers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-fg-muted">Clientes Recorrentes</span>
                  <span className="text-sm font-medium text-fg-primary">{customersReport?.summary.returning_customers || 0}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Produtos" value={stockReport?.summary.total_products || 0} icon={CubeIcon} iconClass="text-blue-500" loading={loading} />
        <StatCard title="Estoque Baixo" value={stockReport?.summary.low_stock_count || 0} subtitle={`Limite: ${stockReport?.summary.low_stock_threshold || 10} unidades`} icon={ExclamationTriangleIcon} iconClass="text-orange-500" loading={loading} />
        <StatCard title="Sem Estoque" value={stockReport?.summary.out_of_stock_count || 0} subtitle="Reposição urgente" icon={ExclamationTriangleIcon} iconClass="text-red-500" loading={loading} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-fg-primary mb-4">Produtos com Estoque Baixo</h2>
        {loading ? (
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
                <tr className="border-b border-border-primary">
                  <th className="pb-2 text-left text-fg-muted font-medium px-2">Produto</th>
                  <th className="pb-2 text-left text-fg-muted font-medium px-2">SKU</th>
                  <th className="pb-2 text-left text-fg-muted font-medium px-2">Categoria</th>
                  <th className="pb-2 text-right text-fg-muted font-medium px-2">Estoque</th>
                  <th className="pb-2 text-right text-fg-muted font-medium px-2">Preço</th>
                  <th className="pb-2 text-left text-fg-muted font-medium px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockReport?.low_stock_products.map((p) => (
                  <tr key={p.id} className="border-b border-border-primary last:border-0">
                    <td className="py-2 px-2 font-medium text-fg-primary">{p.name}</td>
                    <td className="py-2 px-2 text-fg-muted">{p.sku || '-'}</td>
                    <td className="py-2 px-2"><Badge variant="outline">{p.category || 'Sem categoria'}</Badge></td>
                    <td className="py-2 px-2 text-right">
                      <Badge variant={p.stock_quantity === 0 ? 'danger' : 'warning'}>{p.stock_quantity || 0}</Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-fg-primary">{formatCurrency(p.price)}</td>
                    <td className="py-2 px-2">
                      <Badge variant={p.status === 'active' ? 'success' : 'gray'}>{p.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Relatórios</h1>
          <p className="text-sm text-fg-muted mt-0.5">Análise completa do seu negócio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="text-sm border border-border-primary rounded-lg px-3 py-1.5 bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleExportOrders} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={loadData} isLoading={loading} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-sm text-red-600 hover:underline">Fechar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-primary">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.value
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-fg-muted hover:text-fg-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' ? renderStock() : renderOverview()}
    </div>
  );
};

export default AnalyticsPage;
