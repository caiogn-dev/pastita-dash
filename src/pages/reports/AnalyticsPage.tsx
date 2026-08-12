/**
 * AnalyticsPage - Relatórios (sem Chakra UI)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toCsv, downloadCsv } from '../../utils/csv';
import { formatAxisCurrency } from '../../utils/formatters';
import { Card, Button, Badge, StatCard, PageShell } from '../../components/ui';
import { relatorioPorSlug, type TabValue } from './relatorios';
import { TimeSeriesChart } from '../../components/reports/TimeSeriesChart';
import { RankedList } from './sections/shared';
import { useStore } from '../../hooks/useStore';
import MenuDownloads from '../../components/reports/MenuDownloads';
import ModalCardapioPdf from '../../components/reports/ModalCardapioPdf';
import { ReportsFilterBar } from '../../components/reports/ReportsFilterBar';
import { reportsService, type DateRange } from '../../services/reports';
import {
  useDashboardStats,
  useRevenueReport,
  useProductsReport,
  useStockReport,
  useCustomersReport,
  useOrdersCharts,
} from '../../hooks/queries/useReports';
import { HeatmapSection, ChannelsSection, AbcBasketSection, MenuMatrixSection } from './sections/SalesSections';
import { GeographySection } from './sections/GeographySection';
import { OperationsSection } from './sections/OperationsSections';
import { CrmSection, CohortSection, FinanceSection, BotReviewsSection } from './sections/CrmFinanceBotSections';
import { OverviewSummarySection } from './sections/OverviewSummarySection';
import { StoreScoreSection } from './sections/StoreScoreSection';
import { Link } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useAnalyticsReport } from '../../hooks/queries/useReports';
import type { HeatmapReport } from '../../services/reports';
import { matrizDeProdutos, QUADRANTES, type Quadrante, type ProdutoClassificado } from './matrizDeProdutos';

// 403 plan_upgrade_required nos endpoints de analytics → aba mostra o convite
// de upgrade em vez de seções vazias.
const isPlanLocked = (error: unknown): boolean => {
  const e = error as { response?: { status?: number; data?: { code?: string } } } | null;
  return e?.response?.status === 403 && e.response.data?.code === 'plan_upgrade_required';
};

const UpgradeCard: React.FC = () => (
  <Card className="p-10 text-center">
    <LockClosedIcon className="w-10 h-10 mx-auto text-brand-ink" />
    <h2 className="mt-3 text-lg font-semibold text-fg-token">Relatórios avançados são do plano Pro</h2>
    <p className="mt-1 text-sm text-fg-muted-token max-w-md mx-auto">
      Horários de pico, mapa de calor, segmentos de clientes, engenharia de cardápio e mais —
      liberados no Pro e no Premium. A Visão Geral continua disponível no seu plano.
    </p>
    <Link
      to="/assinatura"
      className="inline-block mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
    >
      Ver planos
    </Link>
  </Card>
);

type GroupBy = 'day' | 'week' | 'month';
// TabValue e o mapa de relatórios moram em `relatorios.ts` — a página deixou
// de ser dona da navegação dela.

// Rótulos pt-BR dos status de pedido (para a distribuição na aba Pedidos).
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', processing: 'Processando',
  paid: 'Pago', preparing: 'Preparando', ready: 'Pronto', shipped: 'Enviado',
  out_for_delivery: 'Em entrega', delivered: 'Entregue', completed: 'Concluído',
  cancelled: 'Cancelado', refunded: 'Reembolsado', failed: 'Falhou',
};
const NEGATIVE_STATUSES = new Set(['cancelled', 'refunded', 'failed']);

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

// Rótulos do gráfico adaptados ao agrupamento. Antes era 'dd/MM' fixo: no modo
// Mês saía "01/06" (parece dia) e na aba Faturamento o tooltip nem formatava →
// mostrava a string ISO crua "2026-06-01T00:00:00-03:00". day vem como date,
// week/month como datetime com timezone — parseISO cobre os dois.
const axisTickLabel = (v: string, gb: GroupBy) => {
  try {
    const d = parseISO(v);
    if (gb === 'month') return format(d, 'MMM/yy', { locale: ptBR });
    if (gb === 'week') return format(d, "'sem' dd/MM", { locale: ptBR });
    return format(d, 'dd/MM', { locale: ptBR });
  } catch { return v; }
};
const tooltipDateLabel = (l: unknown, gb: GroupBy) => {
  try {
    const d = parseISO(String(l));
    if (gb === 'month') return format(d, "MMMM 'de' yyyy", { locale: ptBR });
    if (gb === 'week') return format(d, "'Semana de' dd/MM", { locale: ptBR });
    return format(d, "dd 'de' MMMM", { locale: ptBR });
  } catch { return String(l); }
};

// Abas agrupadas por tema — a barra plana com 12 itens virava sopa de letras.
// ─── Main ─────────────────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
  // O relatório vem da URL: some a segunda navegação dentro da página e o
  // link passa a valer (mandar por WhatsApp, voltar no histórico).
  const { relatorio: slugDaRota } = useParams<{ relatorio?: string }>();
  const relatorio = relatorioPorSlug(slugDaRota);
  const [visaoEscolhida, setVisaoEscolhida] = useState<TabValue | null>(null);
  const activeTab: TabValue =
    (visaoEscolhida && relatorio.visoes.some((v) => v.value === visaoEscolhida)
      ? visaoEscolhida
      : relatorio.visoes[0].value);
  // Trocar de relatório zera a visão: manter a antiga mostraria conteúdo de
  // outro relatório sob um título que não é o dele.
  useEffect(() => { setVisaoEscolhida(null); }, [relatorio.slug]);
  const [range, setRange] = useState<DateRange>({ period: '30d' });
  const [cardapioAberto, setCardapioAberto] = useState(false);
  const { storeId } = useStore();
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [errorDismissed, setErrorDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Cada relatório só é buscado quando a aba ativa precisa dele. A queryKey
  // (em useReports) garante que trocar groupBy só refaz o faturamento e que
  // navegar entre abas reaproveita o cache.
  const needsRevenue = activeTab === 'overview' || activeTab === 'orders';
  const needsProducts = activeTab === 'overview' || activeTab === 'products';
  const needsCustomers = activeTab === 'overview' || activeTab === 'crm';

  // Sonda do gate de plano: qualquer endpoint avançado serve; heatmap é leve.
  // Só dispara quando uma aba avançada está ativa (cacheada por loja+range).
  const advancedTabs: TabValue[] = ['peaks', 'geo', 'operations', 'crm', 'finance', 'bot', 'products'];
  const planProbe = useAnalyticsReport<HeatmapReport>('heatmap', range, advancedTabs.includes(activeTab));
  const planLocked = isPlanLocked(planProbe.error);

  const statsQuery = useDashboardStats(activeTab === 'overview');
  const revenueQuery = useRevenueReport(range, groupBy, needsRevenue);
  const productsQuery = useProductsReport(range, needsProducts);
  const stockQuery = useStockReport(activeTab === 'stock');
  const customersQuery = useCustomersReport(range, needsCustomers);
  const ordersQuery = useOrdersCharts(range, activeTab === 'orders');

  const dashboardStats = statsQuery.data ?? null;
  const revenueReport = revenueQuery.data ?? null;
  const productsReport = productsQuery.data ?? null;
  const stockReport = stockQuery.data ?? null;
  const customersReport = customersQuery.data ?? null;
  const ordersCharts = ordersQuery.data ?? null;
  const ordersLoading = ordersQuery.isLoading;

  // Loadings granulares: cada seção mostra spinner só enquanto o SEU dado carrega.
  const statsLoading = statsQuery.isLoading;
  const revenueLoading = revenueQuery.isLoading;
  const productsLoading = productsQuery.isLoading;
  const stockLoading = stockQuery.isLoading;
  const customersLoading = customersQuery.isLoading;

  // Erro derivado de qualquer query ativa (sem setState no render).
  const hasError = [
    statsQuery, revenueQuery, productsQuery, stockQuery, customersQuery, ordersQuery,
  ].some(q => q.isError);
  const error = hasError && !errorDismissed
    ? 'Erro ao carregar relatórios. Tente novamente.'
    : null;

  const activeTabLoading =
    activeTab === 'orders' ? ordersLoading || revenueLoading
    : activeTab === 'products' ? productsLoading
    : activeTab === 'stock' ? stockLoading
    : activeTab === 'crm' ? customersLoading
    : statsLoading;
  const anyFetching = [
    statsQuery, revenueQuery, productsQuery, stockQuery, customersQuery, ordersQuery,
  ].some(q => q.isFetching);

  // "Atualizar" reativa o banner de erro e invalida os relatórios em cache.
  const loadData = () => {
    setErrorDismissed(false);
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const handleExportOrders = async () => {
    try {
      const blob = await reportsService.exportOrdersCSV({ ...range });
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
    orders: handleExportRevenue,
    products: handleExportProducts,
    stock: handleExportStock,
    crm: handleExportCustomers,
  };

  // ─── Overview Tab ──────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* "Hoje" e alertas moram no herói do Resumo do período — sem parede de cards duplicada */}
      {/* Revenue chart */}
      <Card className="p-4">
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
          <TimeSeriesChart
            data={revenueReport?.data || []}
            xKey="period"
            yKey="total_revenue"
            label="Faturamento"
            color="#166534"
            height={350}
            valueFormat={formatCurrency}
            yTickFormat={formatAxisCurrency}
            xTickFormat={(v) => axisTickLabel(v, groupBy)}
            tooltipLabelFormat={(v) => tooltipDateLabel(v, groupBy)}
          />
        )}
      </Card>

      {/* Bottom two columns */}
      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
        {/* Top Products */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-fg-token">Produtos Mais Vendidos</h2>
            <Badge tone="neutral">Top 5</Badge>
          </div>
          {productsLoading ? <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /> : (
            <RankedList
              items={(productsReport?.top_products || []).slice(0, 5).map((p) => ({
                label: p.product_name,
                sub: `${p.total_quantity} vendidos`,
                value: p.total_revenue,
                valueLabel: formatCurrency(p.total_revenue),
              }))}
            />
          )}
        </Card>

        {/* Customer Stats */}
        <Card className="p-4">
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

  // ─── Pedidos Tab ───────────────────────────────────────────────────────────

  const renderOrders = () => {
    const perDay = ordersCharts?.orders_per_day ?? [];
    const statuses = ordersCharts?.order_statuses ?? {};
    const totalOrders = perDay.reduce((acc, d) => acc + (d.count || 0), 0);
    const totalRevenue = perDay.reduce((acc, d) => acc + (d.revenue || 0), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgPerDay = perDay.length > 0 ? totalOrders / perDay.length : 0;
    const cancelled = Object.entries(statuses)
      .filter(([k]) => NEGATIVE_STATUSES.has(k))
      .reduce((acc, [, v]) => acc + (Number(v) || 0), 0);
    const cancelPct = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;

    const statusItems = Object.entries(statuses)
      .map(([k, v]) => ({
        label: ORDER_STATUS_LABELS[k] || k,
        value: Number(v) || 0,
        danger: NEGATIVE_STATUSES.has(k),
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <KpiCard title="Faturamento pago" value={formatCurrency(revenueReport?.summary.total_revenue || 0)} tone="brand" loading={revenueLoading} />
          <KpiCard title="Pedidos no período" value={totalOrders} subtitle={`${avgPerDay.toFixed(1).replace('.', ',')} por dia`} loading={ordersLoading} />
          <KpiCard title="Ticket médio" value={formatCurrency(revenueReport?.summary.avg_order_value || avgTicket)} subtitle={`Taxas de entrega: ${formatCurrency(revenueReport?.summary.total_delivery_fees || 0)}`} loading={revenueLoading} />
          <KpiCard title="Cancelados" value={cancelled} subtitle={`${cancelPct.toFixed(1)}% do total`} tone="warning" loading={ordersLoading} />
        </div>

        {/* Faturamento por período (fundido da antiga aba Faturamento) */}
        <Card className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-fg-token">Faturamento por período</h2>
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
            <TimeSeriesChart
              data={revenueReport?.data || []}
              xKey="period"
              yKey="total_revenue"
              label="Faturamento"
              height={300}
              valueFormat={formatCurrency}
              yTickFormat={formatAxisCurrency}
              xTickFormat={(v) => axisTickLabel(v, groupBy)}
              tooltipLabelFormat={(v) => tooltipDateLabel(v, groupBy)}
            />
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold text-fg-token mb-4">Pedidos por dia</h2>
          {ordersLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <TimeSeriesChart
              data={perDay}
              xKey="date"
              yKey="count"
              label="Pedidos"
              type="bar"
              valueFormat={(v) => new Intl.NumberFormat('pt-BR').format(v)}
              xTickFormat={(v) => axisTickLabel(v, 'day')}
              tooltipLabelFormat={(v) => tooltipDateLabel(v, 'day')}
            />
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold text-fg-token mb-4">Distribuição por status</h2>
          {ordersLoading ? (
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <RankedList items={statusItems} medals={false} />
          )}
        </Card>
      </div>
    );
  };

  // ─── Stock Tab ─────────────────────────────────────────────────────────────

  const renderStock = () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
        <KpiCard title="Total de Produtos" value={stockReport?.summary.total_products || 0} loading={stockLoading} />
        <KpiCard title="Estoque Baixo" value={stockReport?.summary.low_stock_count || 0} subtitle={`Limite: ${stockReport?.summary.low_stock_threshold || 10} unidades`} tone="warning" loading={stockLoading} />
        <KpiCard title="Sem Estoque" value={stockReport?.summary.out_of_stock_count || 0} subtitle="Reposição urgente" tone="warning" loading={stockLoading} />
      </div>
      <Card className="p-4">
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
          <RankedList
            medals={false}
            max={stockReport?.summary.low_stock_threshold || 10}
            items={(stockReport?.low_stock_products || []).map((p) => ({
              label: p.name,
              badge: (
                <Badge tone={(p.stock_quantity || 0) === 0 ? 'danger' : 'warning'}>
                  {(p.stock_quantity || 0) === 0 ? 'Esgotado' : `${p.stock_quantity} restantes`}
                </Badge>
              ),
              sub: [p.sku, p.category || 'Sem categoria', formatCurrency(p.price)].filter(Boolean).join(' · '),
              value: p.stock_quantity || 0,
              valueLabel: `${p.stock_quantity || 0} un`,
              danger: (p.stock_quantity || 0) === 0,
            }))}
          />
        )}
      </Card>
    </div>
  );

  // Classificação do cardápio nos quatro quadrantes. Calculada sobre o mesmo
  // `top_products` que a lista abaixo mostra: dois cortes diferentes dos
  // mesmos dados discordariam na tela.
  const matriz = useMemo(
    () => matrizDeProdutos(productsReport?.top_products),
    [productsReport?.top_products]
  );

  const renderProducts = () => (
    <div className="flex flex-col gap-6">
      {/* O ranking responde "o que mais vendeu" e para por aí. Estes quatro
          grupos respondem o que FAZER com cada item — e um prato que sai muito
          e fatura pouco não é ruim, é chamariz: a ação é subir o combo em
          volta dele, não tirá-lo. */}
      {matriz.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-fg-token mb-1">O que fazer com o cardápio</h2>
          <p className="text-sm text-fg-muted-token mb-4">
            Cada item comparado com a MEDIANA do cardápio em duas medidas: quanto sai e
            quanto fatura. Mediana e não média — um prato caro puxaria a média e jogaria
            metade do cardápio para o lado fraco.
          </p>
          <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-4">
            {(Object.keys(QUADRANTES) as Quadrante[]).map((chave: Quadrante) => {
              const q = QUADRANTES[chave];
              const itens: ProdutoClassificado[] = matriz.filter((p: ProdutoClassificado) => p.quadrante === chave);
              return (
                <div key={chave} className="rounded-xl border border-border-token p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={`font-semibold ${
                      q.tom === 'bom' ? 'text-[var(--success)]'
                        : q.tom === 'atencao' ? 'text-[var(--warning)]'
                        : 'text-fg-token'
                    }`}>
                      {q.rotulo}
                    </h3>
                    <span className="text-sm text-fg-muted-token">
                      {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted-token mt-0.5">{q.definicao}</p>

                  {itens.length === 0 ? (
                    <p className="mt-3 text-sm text-fg-muted-token">Nenhum item aqui.</p>
                  ) : (
                    <ul className="mt-3 space-y-1">
                      {itens.slice(0, 5).map((p: ProdutoClassificado) => (
                        <li key={p.product_id ?? p.product_name} className="flex justify-between gap-3 text-sm">
                          <span className="truncate text-fg-token">{p.product_name}</span>
                          <span className="shrink-0 text-fg-muted-token">
                            {p.total_quantity}un · {formatCurrency(p.total_revenue)}
                          </span>
                        </li>
                      ))}
                      {itens.length > 5 && (
                        <li className="text-xs text-fg-muted-token">e mais {itens.length - 5}…</li>
                      )}
                    </ul>
                  )}

                  <p className="mt-3 border-t border-border-token pt-2 text-sm text-fg-token">
                    {q.acao}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-fg-token">Performance de Produtos</h2>
          <Badge tone="neutral">{productsReport?.top_products.length || 0} produtos</Badge>
        </div>
        {productsLoading ? (
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        ) : (
          <RankedList
            items={(productsReport?.top_products || []).map((p) => ({
              label: p.product_name,
              sub: `${p.total_quantity} vendidos · ${p.order_count} pedidos${p.current_stock != null ? ` · ${p.current_stock} em estoque` : ''}`,
              value: p.total_revenue,
              valueLabel: formatCurrency(p.total_revenue),
            }))}
          />
        )}
      </Card>
    </div>
  );

  // KPIs de base de clientes — abrem a aba Clientes, acima do perfil por cliente
  const renderCustomersKpis = () => (
    <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
      <KpiCard title="Clientes" value={customersReport?.summary.total_customers || 0} tone="brand" loading={customersLoading} />
      <KpiCard title="Novos" value={customersReport?.summary.new_customers || 0} loading={customersLoading} />
      <KpiCard title="Recorrentes" value={customersReport?.summary.returning_customers || 0} loading={customersLoading} />
      <KpiCard title="Retenção" value={`${customersReport?.summary.retention_rate || 0}%`} loading={customersLoading} />
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell
      trilha={[{ rotulo: 'Relatórios' }, { rotulo: relatorio.titulo }]}
      titulo={relatorio.titulo}
      descricao={relatorio.descricao}
      acoes={
        <>
          {/* Um menu só: cada relatório aparece uma vez, com CSV e Excel lado
              a lado. Antes eram dois botões soltos e só CSV cru. */}
          <MenuDownloads
            range={range}
            onEscolherCardapio={() => setCardapioAberto(true)}
            onExportarAba={exportForTab[activeTab]}
            abaLabel={`Aba ${activeTab}`}
            abaDesabilitada={activeTabLoading}
          />
          <Button variant="ghost" onClick={loadData} disabled={anyFetching} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Atualizar
          </Button>
        </>
      }
      // O filtro de período é sobre os DADOS, não sobre a página — por isso
      // desce para a faixa de filtros em vez de ficar entre os botões de ação.
      filtros={<ReportsFilterBar value={range} onChange={setRange} />}
    >
      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
          <button onClick={() => setErrorDismissed(true)} className="text-sm text-red-600 hover:underline">Fechar</button>
        </div>
      )}

      {/* Uma visão só = nenhum seletor. Botão que não escolhe nada é
          decoração que o olho ainda precisa processar. */}
      {relatorio.visoes.length > 1 && (
        <div
          role="tablist"
          aria-label={`Visões de ${relatorio.titulo}`}
          className="mb-6 inline-flex flex-wrap gap-1 rounded-xl border border-border-token bg-surface-2 p-1"
        >
          {relatorio.visoes.map((v) => (
            <button
              key={v.value}
              role="tab"
              aria-selected={activeTab === v.value}
              onClick={() => setVisaoEscolhida(v.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === v.value
                  ? 'bg-surface text-fg-token shadow-sm'
                  : 'text-fg-muted-token hover:text-fg-token'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'stock' && renderStock()}
      {activeTab === 'products' && (
        <div className="flex flex-col gap-6">
          {renderProducts()}
          {planLocked ? (
            <UpgradeCard />
          ) : (
            <>
              <AbcBasketSection range={range} enabled />
              <MenuMatrixSection range={range} enabled />
            </>
          )}
        </div>
      )}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          <OverviewSummarySection range={range} enabled />
          <StoreScoreSection range={range} enabled />
          {renderOverview()}
        </div>
      )}
      {activeTab === 'peaks' && (planLocked ? <UpgradeCard /> : (
        <div className="flex flex-col gap-6">
          <HeatmapSection range={range} enabled />
          <ChannelsSection range={range} enabled />
        </div>
      ))}
      {activeTab === 'geo' && (planLocked ? <UpgradeCard /> : <GeographySection range={range} enabled />)}
      {activeTab === 'operations' && (planLocked ? <UpgradeCard /> : <OperationsSection range={range} enabled />)}
      {activeTab === 'crm' && (planLocked ? <UpgradeCard /> : (
        <div className="flex flex-col gap-6">
          {renderCustomersKpis()}
          <CrmSection range={range} enabled />
          <CohortSection range={range} enabled />
        </div>
      ))}
      {activeTab === 'finance' && (planLocked ? <UpgradeCard /> : <FinanceSection range={range} enabled />)}
      {activeTab === 'bot' && (planLocked ? <UpgradeCard /> : <BotReviewsSection range={range} enabled />)}

      <ModalCardapioPdf
        aberto={cardapioAberto}
        onFechar={() => setCardapioAberto(false)}
        storeId={storeId ?? undefined}
      />
    </PageShell>
  );
};

export default AnalyticsPage;
