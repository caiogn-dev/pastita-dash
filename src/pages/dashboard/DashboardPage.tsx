/**
 * DashboardPage — Painel operacional de uma loja
 * Design: hierarquia clara, foco em pedidos e atendimento, ações rápidas no topo
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CpuChipIcon,
  EnvelopeIcon,
  ArchiveBoxXMarkIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, Button, Badge } from '../../components/common';
import { dashboardService } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { useFetch } from '../../hooks/useFetch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotificationSound, useOrdersWebSocket, useStore, useTheme } from '../../hooks';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => CURRENCY.format(v);

// ──────────────────────────────────────────────────────────
// Alert Banner
// ──────────────────────────────────────────────────────────
const AlertBanner: React.FC<{
  pendingOrders: number;
  openConversations: number;
  lowStockProducts: number;
  paymentsPending: number;
  storeOrdersRoute: string;
  storeProductsRoute: string;
}> = ({ pendingOrders, openConversations, lowStockProducts, paymentsPending, storeOrdersRoute, storeProductsRoute }) => {
  const hasAlerts = pendingOrders > 0 || openConversations > 0 || lowStockProducts > 0 || paymentsPending > 0;
  if (!hasAlerts) return null;

  return (
    <div className="flex items-center gap-3 p-3 px-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 flex-wrap">
      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <div className="flex gap-4 flex-1 flex-wrap items-center">
        {pendingOrders > 0 && (
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            <strong>{pendingOrders}</strong> pedido{pendingOrders > 1 ? 's' : ''} aguardando confirmação
          </p>
        )}
        {openConversations > 0 && (
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            <strong>{openConversations}</strong> conversa{openConversations > 1 ? 's' : ''} em aberto
          </p>
        )}
        {paymentsPending > 0 && (
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            <strong>{paymentsPending}</strong> pagamento{paymentsPending > 1 ? 's' : ''} pendente{paymentsPending > 1 ? 's' : ''}
          </p>
        )}
        {lowStockProducts > 0 && (
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
            <strong>{lowStockProducts}</strong> produto{lowStockProducts > 1 ? 's' : ''} com estoque baixo
          </p>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {lowStockProducts > 0 && (
          <Button size="sm" variant="ghost" onClick={() => window.location.href = storeProductsRoute}>
            Estoque
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          rightIcon={<ArrowRightIcon className="w-3 h-3" />}
          onClick={() => window.location.href = storeOrdersRoute}
        >
          Ver pedidos
        </Button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral';
  href?: string;
  badge?: { label: string; variant: 'solid' | 'subtle' | 'outline'; colorPalette?: string };
  loading?: boolean;
}

const variantMap = {
  brand:   { bg: '#fff7ed', icon: '#F97316', border: 'rgba(249,115,22,0.18)',   darkBg: 'rgba(249,115,22,0.20)',   darkIcon: '#fb923c' },
  success: { bg: '#f0fdf4', icon: '#16a34a', border: 'rgba(22,163,74,0.18)',   darkBg: 'rgba(22,163,74,0.18)',   darkIcon: '#4ade80' },
  warning: { bg: '#fffbeb', icon: '#d97706', border: 'rgba(217,119,6,0.18)',   darkBg: 'rgba(217,119,6,0.18)',   darkIcon: '#fbbf24' },
  danger:  { bg: '#fff1f2', icon: '#dc2626', border: 'rgba(220,38,38,0.18)',   darkBg: 'rgba(220,38,38,0.16)',   darkIcon: '#f87171' },
  accent:  { bg: '#fff7ed', icon: '#ea580c', border: 'rgba(234,88,12,0.18)',   darkBg: 'rgba(234,88,12,0.16)',   darkIcon: '#fb923c' },
  neutral: { bg: '#f8fafc', icon: '#64748b', border: 'rgba(100,116,139,0.18)', darkBg: 'rgba(100,116,139,0.16)', darkIcon: '#94a3b8' },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon: Icon, variant = 'brand', href, badge, loading }) => {
  const c = variantMap[variant];
  const inner = (
    <div
      className="h-full p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-[0_1px_4px_rgba(0,0,0,.05)] transition-all duration-200"
      style={href ? undefined : undefined}
    >
      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="h-4 w-3/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-2/5 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider uppercase">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{subtitle}</p>
            )}
            {badge && (
              <Badge colorPalette={badge.colorPalette as any} variant="subtle" size="sm">
                {badge.label}
              </Badge>
            )}
          </div>
          <div
            className="p-2.5 rounded-lg flex-shrink-0"
            style={{ background: c.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: c.icon }} />
          </div>
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block h-full hover:-translate-y-px transition-transform">
        {inner}
      </a>
    );
  }
  return <div className="h-full">{inner}</div>;
};

// ──────────────────────────────────────────────────────────
// Progress bar metric row
// ──────────────────────────────────────────────────────────
const MetricRow: React.FC<{ label: string; value: number | string; progress?: number; color?: string }> = ({
  label, value, progress, color = '#22c55e',
}) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
    {progress !== undefined && (
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%`, background: color }}
        />
      </div>
    )}
  </div>
);

// ──────────────────────────────────────────────────────────
// Conversation mode label map
// ──────────────────────────────────────────────────────────
const modeLabel: Record<string, { label: string; color: string }> = {
  auto:   { label: 'Automatizado (IA)', color: '#F97316' },
  human:  { label: 'Humano',           color: '#2563eb' },
  hybrid: { label: 'Híbrido',          color: '#7c3aed' },
};

// ──────────────────────────────────────────────────────────
// Skeleton block helper
// ──────────────────────────────────────────────────────────
const Skel: React.FC<{ h: string }> = ({ h }) => (
  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" style={{ height: h }} />
);

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedAccount } = useAccountStore();
  const { store } = useStore();
  const { playNotificationSound } = useNotificationSound();
  const [chartRangeDays, setChartRangeDays] = useState(7);
  const refreshTimeoutRef = useRef<number | null>(null);

  const storeKey = store?.slug || store?.id;
  const storeOrdersRoute = storeKey ? `/stores/${storeKey}/orders` : '/stores';
  const storeProductsRoute = storeKey ? `/stores/${storeKey}/products` : '/stores';
  const chatRoute = '/whatsapp/chat';

  const fetchOverview = useCallback(
    () => dashboardService.getOverview({ store: storeKey || undefined, accountId: selectedAccount?.id }),
    [selectedAccount?.id, storeKey]
  );
  const { data: overview, loading: isLoadingOverview, refresh: refreshOverview } = useFetch(fetchOverview);

  const fetchCharts = useCallback(
    () => dashboardService.getCharts({ store: storeKey || undefined, accountId: selectedAccount?.id, days: chartRangeDays }),
    [chartRangeDays, selectedAccount?.id, storeKey]
  );
  const { data: charts, loading: isLoadingCharts, refresh: refreshCharts } = useFetch(fetchCharts);

  const fetchStats = useCallback(
    () => storeKey ? dashboardService.getStats(storeKey) : Promise.resolve(null),
    [storeKey]
  );
  const { data: stats } = useFetch(fetchStats);

  const fetchActivity = useCallback(
    () => dashboardService.getActivity({ store: storeKey || undefined, accountId: selectedAccount?.id, limit: 10 }),
    [selectedAccount?.id, storeKey]
  );
  const { data: activity, loading: isLoadingActivity } = useFetch(fetchActivity);

  const scheduleRefresh = useCallback((delay = 700) => {
    if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => void Promise.all([refreshOverview(), refreshCharts()]), delay);
  }, [refreshCharts, refreshOverview]);

  useEffect(() => () => { if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current); }, []);

  useOrdersWebSocket({
    enabled: Boolean(storeKey),
    onOrderCreated: () => { playNotificationSound(); scheduleRefresh(250); },
    onOrderUpdated: () => scheduleRefresh(900),
    onOrderCancelled: () => scheduleRefresh(900),
    onPaymentReceived: () => { playNotificationSound(); scheduleRefresh(500); },
  });

  // ── Derived metrics ──
  const pendingOrders       = overview?.orders.by_status.pending || 0;
  const openConversations   = overview?.conversations.by_status.open || 0;
  const resolvedToday       = overview?.conversations.resolved_today || 0;
  const paymentsPending     = overview?.payments.pending || 0;
  const paymentsCompletedToday = overview?.payments.completed_today || 0;
  const inboundMessages     = Number(overview?.messages.by_direction.inbound || 0);
  const outboundMessages    = Number(overview?.messages.by_direction.outbound || 0);
  const deliveredMessages   = Number(overview?.messages.by_status.delivered || 0);
  const readMessages        = Number(overview?.messages.by_status.read || 0);
  const failedMessages      = Number(overview?.messages.by_status.failed || 0);
  const sentMessages        = Number(overview?.messages.by_status.sent || 0);
  const deliveryRate        = outboundMessages > 0 ? Math.round(((deliveredMessages + readMessages) / outboundMessages) * 100) : 0;
  const readRate            = outboundMessages > 0 ? Math.round((readMessages / outboundMessages) * 100) : 0;
  const ordersInProgress    = (overview?.orders.by_status.confirmed || 0) + (overview?.orders.by_status.preparing || 0) + (overview?.orders.by_status.processing || 0);
  const hasStatusData       = [sentMessages, deliveredMessages, readMessages, failedMessages].some((v) => v > 0);

  const revenueChangePct  = stats?.today?.revenue_change_percent ?? null;
  const revenueChangeAbs  = stats?.today?.revenue_change ?? null;
  const lowStockCount     = stats?.alerts?.low_stock_products ?? 0;
  const weekRevenue       = stats?.week?.revenue ?? overview?.orders.revenue_month ?? 0;
  const monthRevenue      = stats?.month?.revenue ?? overview?.orders.revenue_month ?? 0;

  const chartTextColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, padding: 14, font: { size: 12 }, color: isDark ? '#d1d5db' : '#374151' },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { font: { size: 11 }, color: chartTextColor } },
      x: { grid: { display: false },               ticks: { font: { size: 11 }, color: chartTextColor } },
    },
  }), [isDark, chartTextColor, chartGridColor]);

  const messagesChartData = {
    labels: charts?.messages_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      { label: 'Recebidas', data: charts?.messages_per_day.map((d) => d.inbound)  || [], borderColor: '#25D366', backgroundColor: 'rgba(37,211,102,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
      { label: 'Enviadas',  data: charts?.messages_per_day.map((d) => d.outbound) || [], borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.10)',  fill: true, tension: 0.35, pointRadius: 3 },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [{ label: 'Pedidos', data: charts?.orders_per_day.map((d) => d.count) || [], borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.12)', fill: true, tension: 0.35, pointRadius: 3 }],
  };

  const statusChartData = {
    labels: ['Enviadas', 'Entregues', 'Lidas', 'Falhas'],
    datasets: [{ data: [sentMessages, deliveredMessages, readMessages, failedMessages], backgroundColor: ['#6366f1', '#22c55e', '#0ea5e9', '#ef4444'], borderWidth: 0 }],
  };

  const chartRangeOptions = [
    { value: 7,  label: '7 dias' },
    { value: 14, label: '14 dias' },
    { value: 30, label: '30 dias' },
    { value: 90, label: '90 dias' },
  ];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite';
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-5">
      {/* ── Hero strip ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{todayLabel}</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {greeting}{store?.name ? `, ${store.name}` : ''} 👋
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Operação ativa</span>
          </div>
          <Button size="sm" leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={() => window.location.href = chatRoute}>
            Abrir chat
          </Button>
          <Button size="sm" variant="outline" leftIcon={<ShoppingCartIcon className="w-4 h-4" />} onClick={() => window.location.href = storeOrdersRoute}>
            Pedidos
          </Button>
        </div>
      </div>

      {/* ── Alert banner ── */}
      <AlertBanner
        pendingOrders={pendingOrders}
        openConversations={openConversations}
        lowStockProducts={lowStockCount}
        paymentsPending={paymentsPending}
        storeOrdersRoute={storeOrdersRoute}
        storeProductsRoute={storeProductsRoute}
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Receita hoje"
          value={fmt(overview?.orders.revenue_today || 0)}
          subtitle={`Semana: ${fmt(weekRevenue)} · Mês: ${fmt(monthRevenue)}`}
          icon={CurrencyDollarIcon}
          variant="success"
          href={storeOrdersRoute}
          badge={revenueChangePct !== null ? {
            label: `${revenueChangePct >= 0 ? '↑' : '↓'} ${Math.abs(revenueChangePct).toFixed(1)}% vs ontem`,
            variant: 'subtle',
            colorPalette: revenueChangePct >= 0 ? 'success' : 'danger',
          } : undefined}
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Pedidos hoje"
          value={overview?.orders.today || 0}
          subtitle={pendingOrders > 0 ? `${pendingOrders} pendente(s) · ${ordersInProgress} em andamento` : `${ordersInProgress} em andamento`}
          icon={ShoppingCartIcon}
          variant={pendingOrders > 0 ? 'warning' : 'accent'}
          href={storeOrdersRoute}
          badge={pendingOrders > 0 ? { label: `${pendingOrders} pendente${pendingOrders > 1 ? 's' : ''}`, variant: 'subtle', colorPalette: 'warning' } : undefined}
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Conversas ativas"
          value={overview?.conversations.active || 0}
          subtitle={`${openConversations} abertas · ${resolvedToday} resolvidas hoje`}
          icon={ChatBubbleLeftRightIcon}
          variant={openConversations > 5 ? 'danger' : 'brand'}
          href={chatRoute}
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Mensagens hoje"
          value={overview?.messages.today || 0}
          subtitle={`${inboundMessages} rec. / ${outboundMessages} env. · semana: ${overview?.messages.week || 0}`}
          icon={EnvelopeIcon}
          variant="neutral"
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Pagamentos"
          value={paymentsCompletedToday}
          subtitle={`${paymentsPending} pendente${paymentsPending !== 1 ? 's' : ''} · entrega: ${deliveryRate}%`}
          icon={CreditCardIcon}
          variant={paymentsPending > 0 ? 'warning' : 'success'}
          badge={paymentsPending > 0 ? { label: `${paymentsPending} pendente${paymentsPending > 1 ? 's' : ''}`, variant: 'subtle', colorPalette: 'warning' } : undefined}
          loading={isLoadingOverview}
        />
        <KpiCard
          title="IA hoje"
          value={overview?.agents.interactions_today || 0}
          subtitle={`${overview?.agents.avg_duration_ms?.toFixed(0) || 0}ms méd.`}
          icon={CpuChipIcon}
          variant="accent"
          href="/agents"
          badge={lowStockCount > 0 ? { label: `${lowStockCount} produto${lowStockCount > 1 ? 's' : ''} sem estoque`, variant: 'subtle', colorPalette: 'warning' } : undefined}
          loading={isLoadingOverview}
        />
      </div>

      {/* ── Main charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4">
        {/* Messages over time */}
        <Card
          title="Mensagens por período"
          subtitle="Recebidas vs. enviadas"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Período:</span>
              <select
                value={chartRangeDays}
                onChange={(e) => setChartRangeDays(Number(e.target.value))}
                className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {chartRangeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          }
        >
          {isLoadingCharts ? <Skel h="300px" /> : (
            <div style={{ height: 300 }}>
              <Line data={messagesChartData} options={chartOptions} />
            </div>
          )}
        </Card>

        {/* Operations health panel */}
        <Card title="Saúde da operação" subtitle="Métricas em tempo real">
          <div className="flex flex-col gap-4">
            <MetricRow label="Taxa de entrega" value={`${deliveryRate}%`} progress={deliveryRate} color={deliveryRate >= 85 ? '#22c55e' : deliveryRate >= 60 ? '#eab308' : '#ef4444'} />
            <MetricRow label="Taxa de leitura" value={`${readRate}%`} progress={readRate} color="#3b82f6" />

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Mensagens de saída</p>
              <div className="flex flex-col gap-1.5">
                <MetricRow label="Enviadas"  value={sentMessages} />
                <MetricRow label="Entregues" value={deliveredMessages} />
                <MetricRow label="Lidas"     value={readMessages} />
                {failedMessages > 0 && <MetricRow label="Falhas" value={failedMessages} />}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Pedidos em andamento</p>
              <div className="flex flex-col gap-1.5">
                {pendingOrders > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pendentes</span>
                    <Badge variant="warning" size="sm">{pendingOrders}</Badge>
                  </div>
                )}
                <MetricRow label="Confirmados"    value={overview?.orders.by_status.confirmed || 0} />
                <MetricRow label="Em preparo"     value={overview?.orders.by_status.preparing || 0} />
                <MetricRow label="Entregues hoje" value={overview?.orders.by_status.delivered || 0} />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Pagamentos</p>
              <div className="flex flex-col gap-1.5">
                {paymentsPending > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pendentes</span>
                    <Badge variant="warning" size="sm">{paymentsPending}</Badge>
                  </div>
                )}
                <MetricRow label="Concluídos hoje" value={paymentsCompletedToday} />
              </div>
            </div>

            {resolvedToday > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Conversas resolvidas hoje</span>
                </div>
                <Badge variant="success" size="sm">{resolvedToday}</Badge>
              </div>
            )}

            {lowStockCount > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <ArchiveBoxXMarkIcon className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Estoque baixo</span>
                  </div>
                  <Badge variant="warning" size="sm">{lowStockCount} produto{lowStockCount > 1 ? 's' : ''}</Badge>
                </div>
                <button
                  className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                  onClick={() => window.location.href = storeProductsRoute}
                >
                  Ver produtos →
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button variant="outline" size="sm" leftIcon={<ShoppingCartIcon className="w-4 h-4" />} onClick={() => window.location.href = storeOrdersRoute}>
                Gerenciar pedidos
              </Button>
              <Button variant="outline" size="sm" leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />} onClick={() => window.location.href = storeProductsRoute}>
                Atualizar catálogo
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Secondary charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Orders per day */}
        <Card title="Pedidos por dia" subtitle="Volume no período selecionado">
          {isLoadingCharts ? <Skel h="240px" /> : (
            <div style={{ height: 240 }}>
              <Line data={ordersChartData} options={chartOptions} />
            </div>
          )}
        </Card>

        {/* Conversations per day */}
        <Card title="Conversas por dia" subtitle="Novas e resolvidas">
          {isLoadingCharts ? <Skel h="240px" /> : charts?.conversations_per_day && charts.conversations_per_day.length > 0 ? (
            <div style={{ height: 240 }}>
              <Line
                data={{
                  labels: charts.conversations_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })),
                  datasets: [
                    { label: 'Novas',      data: charts.conversations_per_day.map((d) => d.new),      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
                    { label: 'Resolvidas', data: charts.conversations_per_day.map((d) => d.resolved), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)',  fill: true, tension: 0.35, pointRadius: 3 },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados de conversas.</p>
            </div>
          )}
        </Card>

        {/* Revenue trend mini-stats */}
        <Card title="Desempenho financeiro" subtitle="Comparativo de períodos">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Hoje</p>
              <div className="flex justify-between items-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(overview?.orders.revenue_today || 0)}</p>
                {revenueChangePct !== null && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{ background: revenueChangePct >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)' }}
                  >
                    {revenueChangePct >= 0
                      ? <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                      : <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
                    <span className={`text-sm font-semibold ${revenueChangePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueChangePct >= 0 ? '+' : ''}{revenueChangePct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {revenueChangeAbs !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {revenueChangeAbs >= 0 ? '+' : ''}{fmt(revenueChangeAbs)} vs ontem
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Semana (7d)</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(stats?.week?.revenue || 0)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats?.week?.orders || 0} pedidos</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Mês (30d)</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(stats?.month?.revenue || 0)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats?.month?.orders || 0} pedidos</p>
                </div>
              </div>
              {stats?.month?.avg_daily_revenue !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Média diária (mês)</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(stats.month.avg_daily_revenue)}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Conversation modes + message status */}
        <Card title="Canais de atendimento" subtitle="Automação vs. humano">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {Object.entries(overview?.conversations.by_mode || {}).map(([mode, count]) => {
                const m = modeLabel[mode] ?? { label: mode, color: '#64748b' };
                const total = Object.values(overview?.conversations.by_mode ?? {}).reduce((acc: number, b) => acc + Number(b ?? 0), 0);
                const pct = total > 0 ? Math.round((Number(count ?? 0) / total) * 100) : 0;
                return (
                  <div key={mode}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{m.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(overview?.conversations.by_mode || {}).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Sem conversas no período.</p>
              )}
            </div>

            {hasStatusData && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Status das mensagens</p>
                <div style={{ height: 160, maxWidth: 200, margin: '0 auto' }}>
                  <Doughnut
                    data={statusChartData}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 8, padding: 10, font: { size: 11 } } } }, cutout: '58%' }}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <Button variant="outline" size="sm" leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={() => window.location.href = chatRoute}>
                Ir para atendimento
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <Card
          title="Pedidos recentes"
          subtitle="Últimos pedidos da loja"
          action={
            <Button size="xs" variant="ghost" onClick={() => window.location.href = storeOrdersRoute}>
              Ver todos →
            </Button>
          }
        >
          {isLoadingActivity ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => <Skel key={i} h="48px" />)}
            </div>
          ) : activity?.orders && activity.orders.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activity.orders.slice(0, 6).map((order, i) => (
                <div key={order.id} className={`flex justify-between items-center py-1.5 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">#{order.order_number}</span>
                      <Badge
                        size="sm"
                        colorPalette={
                          order.status === 'delivered' || order.status === 'completed' ? 'success' :
                          order.status === 'cancelled' || order.status === 'failed' ? 'danger' :
                          order.status === 'pending' ? 'warning' : 'info'
                        }
                        variant="subtle"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.customer_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(order.total)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum pedido recente.</p>
            </div>
          )}
        </Card>

        {/* Recent messages */}
        <Card
          title="Mensagens recentes"
          subtitle="Últimas mensagens recebidas"
          action={
            <Button size="xs" variant="ghost" onClick={() => window.location.href = chatRoute}>
              Abrir chat →
            </Button>
          }
        >
          {isLoadingActivity ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => <Skel key={i} h="48px" />)}
            </div>
          ) : activity?.messages && activity.messages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activity.messages.slice(0, 6).map((msg, i) => (
                <div key={msg.id} className={`flex gap-3 items-start py-1.5 ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <EnvelopeIcon className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{msg.from_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msg.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{msg.account_name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma mensagem recente.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
