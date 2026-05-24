import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FireIcon,
  TruckIcon,
  ServerStackIcon,
  CubeIcon,
  BoltIcon,
  BellAlertIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Loading } from '../../components/common';
import { useStore } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { getOrders, getOrderStats, updateOrderStatus, StoreOrder } from '../../services/storesApi';
import { dashboardService } from '../../services';
import type { ProjectHealth } from '../../types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);

const PIPELINE = [
  { key: 'pending',          label: 'Pendentes',   color: 'bg-yellow-500' },
  { key: 'confirmed',        label: 'Confirmados', color: 'bg-blue-500' },
  { key: 'preparing',        label: 'Preparando',  color: 'bg-orange-500' },
  { key: 'out_for_delivery', label: 'A caminho',   color: 'bg-indigo-500' },
  { key: 'delivered',        label: 'Entregues',   color: 'bg-green-500' },
];

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  pending:          { label: 'Confirmar',       next: 'confirmed' },
  confirmed:        { label: 'Iniciar preparo',  next: 'preparing' },
  preparing:        { label: 'Despachar',        next: 'out_for_delivery' },
  out_for_delivery: { label: 'Entregue',         next: 'delivered' },
};

const STATUS_BADGE: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'gray'> = {
  pending:          'warning',
  confirmed:        'info',
  preparing:        'warning',
  ready:            'success',
  out_for_delivery: 'info',
  delivered:        'success',
  completed:        'success',
  cancelled:        'danger',
  failed:           'danger',
};

const healthVariant: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
  ok: 'success',
  attention: 'warning',
  critical: 'danger',
  unknown: 'gray',
};

const healthLabel: Record<string, string> = {
  ok: 'Estável',
  attention: 'Atenção',
  critical: 'Crítico',
  unknown: 'Indefinido',
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

type Urgency = 'none' | 'medium' | 'high';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  iconBg?: string;
  iconColor?: string;
  urgency?: Urgency;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon, label, value, sub, accent, iconBg, iconColor, urgency = 'none', onClick,
}) => (
  <div onClick={onClick} className={`flex-1 min-w-0 ${onClick ? 'cursor-pointer' : ''}`}>
    <div className={[
      'h-full rounded-xl border shadow-sm transition-all duration-200 overflow-hidden',
      'bg-white dark:bg-zinc-950',
      onClick ? 'hover:shadow-md hover:-translate-y-0.5' : '',
      urgency === 'high'
        ? 'border-red-200 dark:border-red-900/60'
        : urgency === 'medium'
        ? 'border-yellow-200 dark:border-yellow-900/60'
        : 'border-gray-100 dark:border-zinc-800',
    ].filter(Boolean).join(' ')}>
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">
            {label}
          </p>
          <p className={[
            'text-3xl font-bold tracking-tight truncate leading-none mb-1.5',
            accent ?? 'text-gray-900 dark:text-white',
            urgency === 'high' ? 'animate-pulse' : '',
          ].filter(Boolean).join(' ')}>
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={[
          'shrink-0 p-2.5 rounded-xl',
          iconBg  || 'bg-gray-50 dark:bg-zinc-900',
          iconColor || 'text-gray-400 dark:text-zinc-500',
        ].join(' ')}>
          {icon}
        </div>
      </div>
      {urgency === 'high' && (
        <div className="h-0.5 bg-gradient-to-r from-red-500 to-orange-400" />
      )}
      {urgency === 'medium' && (
        <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-amber-300" />
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Order row with inline advance action
// ─────────────────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: StoreOrder;
  storeRoute: string;
  advancing: string | null;
  onAdvance: (id: string, next: string) => Promise<void>;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, storeRoute, advancing, onAdvance }) => {
  const navigate = useNavigate();
  const action = NEXT_ACTION[order.status];

  return (
    <tr
      className="border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50
                 transition-colors cursor-pointer"
      onClick={() => navigate(`/stores/${storeRoute}/orders/${order.id}`)}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
          #{order.order_number}
        </p>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
          {new Date(order.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer_name || '—'}</p>
        {order.customer_phone && (
          <p className="text-xs text-gray-400 dark:text-zinc-500">{order.customer_phone}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_BADGE[order.status] ?? 'gray'}>
          {order.status_display || order.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(order.total)}</p>
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        {action && (
          <button
            onClick={() => onAdvance(order.id, action.next)}
            disabled={advancing === order.id}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700
                       disabled:opacity-50 text-white font-medium transition-colors whitespace-nowrap"
          >
            {advancing === order.id ? '…' : action.label}
          </button>
        )}
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { storeId, storeSlug } = useStore();
  const storeRoute = storeSlug || storeId || '';

  const [ordersToday, setOrdersToday]           = useState(0);
  const [revenueToday, setRevenueToday]         = useState(0);
  const [pendingCount, setPendingCount]         = useState(0);
  const [conversationsOpen, setConversationsOpen] = useState(0);
  const [recentOrders, setRecentOrders]         = useState<StoreOrder[]>([]);
  const [pipelineCounts, setPipelineCounts]     = useState<Record<string, number>>({});
  const [projectHealth, setProjectHealth]       = useState<ProjectHealth | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [advancing, setAdvancing]               = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt]           = useState(new Date());

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [ordersResp, statsResp, overviewResp, healthResp] = await Promise.allSettled([
        getOrders({ store: storeId }),
        getOrderStats(storeId),
        dashboardService.getOverview({ store: storeId }),
        dashboardService.getProjectHealth({ store: storeId }),
      ]);

      if (ordersResp.status === 'fulfilled') {
        const orders = ordersResp.value.results;
        setRecentOrders(orders.slice(0, 10));
        const counts: Record<string, number> = {};
        orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
        setPipelineCounts(counts);
        setPendingCount(counts['pending'] || 0);
      }

      if (statsResp.status === 'fulfilled' && statsResp.value) {
        setOrdersToday(Number(statsResp.value.total_orders || 0));
        setRevenueToday(Number(statsResp.value.today_revenue || 0));
      }

      if (overviewResp.status === 'fulfilled') {
        const overview = overviewResp.value;
        const cv = overview?.conversations;
        const ov = overview?.orders;
        if (cv) setConversationsOpen(Number(cv.by_status?.open ?? cv.active ?? 0));
        if (ov) {
          setPendingCount(Number(ov.by_status?.pending ?? 0));
          if (!Number.isFinite(Number(statsResp.status === 'fulfilled' ? statsResp.value?.today_revenue : NaN))) {
            setRevenueToday(Number(ov.revenue_today ?? 0));
          }
          if (!Number.isFinite(Number(statsResp.status === 'fulfilled' ? statsResp.value?.total_orders : NaN))) {
            setOrdersToday(Number(ov.today ?? 0));
          }
        }
      }

      if (healthResp.status === 'fulfilled') {
        setProjectHealth(healthResp.value);
      }

      setRefreshedAt(new Date());
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdvance = useCallback(async (orderId: string, nextStatus: string) => {
    setAdvancing(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success('Status atualizado ✓');
      await loadData();
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setAdvancing(null);
    }
  }, [loadData]);

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500 dark:text-zinc-400">Selecione uma loja para ver o dashboard.</p>
        <Button onClick={() => navigate('/stores')}>Selecionar loja</Button>
      </div>
    );
  }

  const maxPipeline = Math.max(...PIPELINE.map((s) => pipelineCounts[s.key] || 0), 1);

  return (
    <div className="space-y-5">

      {/* ── Alert bar ── */}
      {pendingCount > 0 && !loading && (
        <div className={[
          'flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-xl border',
          pendingCount > 3
            ? 'bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-900/50'
            : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40',
        ].join(' ')}>
          <BellAlertIcon className={`h-5 w-5 shrink-0 ${pendingCount > 3 ? 'text-red-500 dark:text-red-400 animate-bounce' : 'text-orange-500 dark:text-orange-400'}`} />
          <div className="flex-1">
            <span className={`text-sm font-semibold ${pendingCount > 3 ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'}`}>
              {pendingCount} pedido{pendingCount > 1 ? 's' : ''} aguardando confirmação
            </span>
          </div>
          <button
            onClick={() => navigate(`/stores/${storeRoute}/orders?status=pending`)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              pendingCount > 3
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            Ver agora →
          </button>
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <ArrowPathIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 max-xl:grid-cols-2 gap-3">
        <KpiCard
          icon={<ShoppingCartIcon className="h-5 w-5" />}
          label="Pedidos hoje"
          value={loading ? '—' : ordersToday}
          sub={!loading && ordersToday === 0 ? 'Nenhum ainda' : undefined}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-500 dark:text-blue-400"
          onClick={() => navigate(`/stores/${storeRoute}/orders`)}
        />
        <KpiCard
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          label="Receita hoje"
          value={loading ? '—' : fmt(revenueToday)}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-500 dark:text-emerald-400"
        />
        <KpiCard
          icon={<ClockIcon className="h-5 w-5" />}
          label="Aguardando"
          value={loading ? '—' : pendingCount}
          accent={pendingCount > 0 ? (pendingCount > 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400') : undefined}
          sub={pendingCount > 0 ? 'Precisam de confirmação' : 'Tudo em dia ✓'}
          iconBg={pendingCount > 0 ? (pendingCount > 3 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-orange-50 dark:bg-orange-950/40') : 'bg-gray-50 dark:bg-zinc-900'}
          iconColor={pendingCount > 0 ? (pendingCount > 3 ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400') : 'text-gray-400 dark:text-zinc-500'}
          urgency={pendingCount > 3 ? 'high' : pendingCount > 0 ? 'medium' : 'none'}
          onClick={() => navigate(`/stores/${storeRoute}/orders?status=pending`)}
        />
        <KpiCard
          icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
          label="Conversas abertas"
          value={loading ? '—' : conversationsOpen}
          accent={conversationsOpen > 0 ? 'text-violet-600 dark:text-violet-400' : undefined}
          iconBg={conversationsOpen > 0 ? 'bg-violet-50 dark:bg-violet-950/40' : 'bg-gray-50 dark:bg-zinc-900'}
          iconColor={conversationsOpen > 0 ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-zinc-500'}
          onClick={() => navigate('/conversations')}
        />
      </div>

      {/* ── Orders + Pipeline ── */}
      <div className="grid grid-cols-3 max-xl:grid-cols-1 gap-4">

        {/* Recent orders — 2/3 */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FireIcon className="h-4 w-4 text-orange-400" />
              Pedidos recentes
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/stores/${storeRoute}/orders/new`)}
                className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Novo pedido
              </button>
              <button
                onClick={() => navigate(`/stores/${storeRoute}/orders`)}
                className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Ver todos <ArrowRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-40"><Loading /></div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-zinc-500">
              <ShoppingCartIcon className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum pedido ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400">Pedido</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400 hidden md:table-cell">Cliente</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400">Total</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-zinc-400">Ação rápida</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      storeRoute={storeRoute}
                      advancing={advancing}
                      onAdvance={handleAdvance}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pipeline — 1/3 */}
        <Card>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <TruckIcon className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pipeline de pedidos</h2>
          </div>
          <div className="p-5 space-y-3">
            {loading ? (
              <div className="flex justify-center py-6"><Loading size="sm" /></div>
            ) : (
              PIPELINE.map(({ key, label, color }) => {
                const count = pipelineCounts[key] || 0;
                const pct = Math.round((count / maxPipeline) * 100);
                return (
                  <button
                    key={key}
                    onClick={() => navigate(`/stores/${storeRoute}/orders?status=${key}`)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400
                                       group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {label}
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-zinc-700'}`}>
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: count > 0 ? `${Math.max(pct, 6)}%` : '0%' }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              onClick={() => navigate(`/stores/${storeRoute}/orders`)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
            >
              Gerenciar todos <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
        </Card>

      </div>

      {/* ── Project health (admins only) ── */}
      {user?.is_staff && <Card noPadding>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ServerStackIcon className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Saúde do sistema</h2>
            <Badge variant={healthVariant[projectHealth?.status || 'unknown'] || 'gray'}>
              {healthLabel[projectHealth?.status || 'unknown'] || 'Indefinido'}
            </Badge>
            {(projectHealth?.automation.pipeline.dropped ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                <ExclamationTriangleIcon className="h-3 w-3" />
                {projectHealth!.automation.pipeline.dropped} mensagens perdidas
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            Ver analytics <ArrowRightIcon className="h-3 w-3" />
          </button>
        </div>

        {loading && !projectHealth ? (
          <div className="flex justify-center items-center h-32"><Loading /></div>
        ) : projectHealth ? (
          <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-zinc-800">

            {/* ── Commerce ── */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800">
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Pedidos 24h</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{projectHealth.commerce.orders_24h}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">{fmt(projectHealth.commerce.revenue_today)} hoje</p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Ticket médio</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(projectHealth.commerce.avg_ticket_month)}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                  {projectHealth.commerce.cancelled_7d > 0
                    ? <span className="text-red-500">{projectHealth.commerce.cancelled_7d} cancel. (7d)</span>
                    : 'sem cancelamentos'}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Pag. pendentes</p>
                <p className={`text-xl font-bold ${projectHealth.commerce.payment_pending > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                  {projectHealth.commerce.payment_pending}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">aguardando</p>
              </div>
            </div>

            {/* ── Messaging ── */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800">
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Mensagens 24h</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{projectHealth.messaging.messages_24h}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                  {projectHealth.messaging.inbound_24h}↓ · {projectHealth.messaging.outbound_24h}↑
                </p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Conversas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{projectHealth.messaging.open_conversations}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                  {projectHealth.messaging.human_conversations} c/ humano
                </p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Pipeline</p>
                <p className={`text-xl font-bold ${projectHealth.automation.pipeline.dropped > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {projectHealth.automation.pipeline.dropped}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                  perdidas · {projectHealth.automation.pipeline.timeouts} timeouts
                </p>
              </div>
            </div>

            {/* ── Side panel: intents + issues ── */}
            <div className="p-4 space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-2.5">
                  <CubeIcon className="h-3.5 w-3.5 mx-auto mb-1 text-gray-400" />
                  <p className={`text-sm font-bold ${projectHealth.catalog.low_stock_products > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                    {projectHealth.catalog.low_stock_products}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500">Est. baixo</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-2.5">
                  <BoltIcon className="h-3.5 w-3.5 mx-auto mb-1 text-gray-400" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{projectHealth.automation.active_agents}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500">Agentes</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 p-2.5">
                  <ExclamationTriangleIcon className={`h-3.5 w-3.5 mx-auto mb-1 ${projectHealth.issues.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <p className={`text-sm font-bold ${projectHealth.issues.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                    {projectHealth.issues.length}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500">Alertas</p>
                </div>
              </div>

              {/* Top intents from pipeline */}
              {projectHealth.automation.pipeline.intent_log_summary?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Top intenções ({projectHealth.automation.pipeline.period_hours}h)
                  </p>
                  <div className="space-y-1.5">
                    {projectHealth.automation.pipeline.intent_log_summary.slice(0, 4).map((item) => {
                      const total = projectHealth.automation.pipeline.total_messages || 1;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.intent_type} className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-600 dark:text-zinc-400 truncate flex-1 capitalize">
                            {item.intent_type.replace(/_/g, ' ')}
                          </span>
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-400 rounded-full" style={{ width: `${Math.max(pct, 8)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 tabular-nums w-5 text-right">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Issues */}
              {projectHealth.issues.length > 0 ? (
                <div className="space-y-1.5">
                  {projectHealth.issues.slice(0, 2).map((issue, idx) => (
                    <button
                      key={`${issue.area}-${idx}`}
                      onClick={() => {
                        if (issue.area === 'orders' || issue.area === 'payments') navigate(`/stores/${storeRoute}/orders`);
                        else if (issue.area === 'catalog') navigate(`/stores/${storeRoute}/products`);
                        else if (issue.area === 'messages') navigate('/whatsapp/inbox');
                        else navigate('/analytics');
                      }}
                      className={`w-full text-left rounded-lg border p-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900 ${
                        issue.level === 'critical'
                          ? 'border-red-200 dark:border-red-900/50'
                          : issue.level === 'warning'
                          ? 'border-yellow-200 dark:border-yellow-900/50'
                          : 'border-gray-100 dark:border-zinc-800'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">{issue.title}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-400 line-clamp-1">{issue.detail}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Nenhum alerta operacional
                </p>
              )}
            </div>

          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500 dark:text-zinc-400">Saúde do sistema indisponível.</div>
        )}
      </Card>}

      {/* Footer */}
      <p className="text-right text-xs text-gray-400 dark:text-zinc-600">
        Atualizado às {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        <button onClick={loadData} className="hover:text-primary-500 underline transition-colors">
          atualizar agora
        </button>
      </p>

    </div>
  );
};

export default DashboardPage;
