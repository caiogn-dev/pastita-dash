import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
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
import { Badge, Button, Loading } from '../../components/common';
import { Card, StatCard } from '../../components/ui';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import OnboardingWizard from '../../components/onboarding/wizard/OnboardingWizard';
import { buildWizardSteps } from '../../components/onboarding/wizard/buildWizardSteps';
import { getChecklist, markWizardSeen } from '../../services/onboarding';
import { useStore, useOrderDetailModal } from '../../hooks';
import { useAuthStore } from '../../stores/authStore';
import { useOrderSound } from '../../hooks/useOrderSound';
import { getOrders, getOrderStats, updateOrderStatus, StoreOrder } from '../../services/storesApi';
import { dashboardService } from '../../services';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import type { Order } from '../../types';
import type { ProjectHealth } from '../../types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number | string) => {
  // A API serializa Decimal como STRING ("219.98"). Number.isFinite(string) é
  // sempre false -> caía em 0 (R$ 0,00 em todo pedido). Coage antes.
  const v = Number(n);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
};

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
// Order row with inline advance action
// ─────────────────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: StoreOrder;
  advancing: string | null;
  onAdvance: (id: string, next: string) => Promise<void>;
  onOpen: (id: string) => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, advancing, onAdvance, onOpen }) => {
  const action = NEXT_ACTION[order.status];

  return (
    <tr
      className="border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50
                 transition-colors cursor-pointer"
      onClick={() => onOpen(order.id)}
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
            className="text-xs px-3 py-1.5 rounded bg-brand hover:bg-brand-hover
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

  // Detalhe do pedido em modal (?pedido=<id>) — abre sem sair do dashboard.
  const { openOrder } = useOrderDetailModal();
  // Reflete no card da lista "pedidos recentes" o que mudar dentro do modal.
  const handleOrderChanged = useCallback((updated: Order) => {
    setRecentOrders((prev) =>
      prev.map((o) =>
        o.id === updated.id
          ? { ...o, status: updated.status, payment_status: updated.payment_status ?? o.payment_status }
          : o,
      ),
    );
  }, []);

  // Onboarding wizard: auto-abre 1× no 1º login de loja incompleta (derivado
  // do checklist + flag wizard_seen do backend; markWizardSeen garante 1 vez só).
  const [wizardOpen, setWizardOpen] = useState(false);
  useEffect(() => {
    if (!storeSlug) return;
    getChecklist(storeSlug).then((c) => {
      if (!c.all_done && !c.wizard_seen) {
        setWizardOpen(true);
        markWizardSeen(storeSlug).catch(() => {});
      }
    }).catch(() => {});
  }, [storeSlug]);

  const { checkAndNotify } = useOrderSound();

  const [ordersToday, setOrdersToday]           = useState(0);
  const [revenueToday, setRevenueToday]         = useState(0);
  const [pendingCount, setPendingCount]         = useState(0);
  const [conversationsOpen, setConversationsOpen] = useState(0);
  const [recentOrders, setRecentOrders]         = useState<StoreOrder[]>([]);
  const [pipelineCounts, setPipelineCounts]     = useState<Record<string, number>>({});
  const [projectHealth, setProjectHealth]       = useState<ProjectHealth | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [healthLoading, setHealthLoading]       = useState(true);
  const [advancing, setAdvancing]               = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt]           = useState(new Date());

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);

    // O card "Saúde do sistema" SÓ é renderizado p/ is_staff (admin). Pra dono de
    // loja comum ele nunca aparece — então NÃO buscar é o certo: era o request mais
    // caro do dashboard (~24 queries, ~4s no cache frio) sendo pago por todo mundo
    // p/ um widget que ninguém via. Staff: fica fora do caminho crítico (não trava KPIs).
    if (user?.is_staff) {
      setHealthLoading(true);
      dashboardService.getProjectHealth({ store: storeId })
        .then((h) => setProjectHealth(h))
        .catch(() => {})
        .finally(() => setHealthLoading(false));
    } else {
      setHealthLoading(false);
    }

    try {
      const [ordersResp, statsResp, overviewResp] = await Promise.allSettled([
        // Só os 10 recentes p/ a tabela — NÃO baixar a lista inteira (page_size
        // default=500 trazia ~3MB numa loja cheia só p/ mostrar 10 + contar status).
        getOrders({ store: storeId, page_size: 10, ordering: '-created_at' }),
        getOrderStats(storeId),
        dashboardService.getOverview({ store: storeId }),
      ]);

      let resolvedPendingCount = 0;

      if (ordersResp.status === 'fulfilled') {
        setRecentOrders(ordersResp.value.results.slice(0, 10));
      }

      if (statsResp.status === 'fulfilled' && statsResp.value) {
        setOrdersToday(Number(statsResp.value.total_orders || 0));
        setRevenueToday(Number(statsResp.value.today_revenue || 0));
        // Pipeline vem do agregado por status (correto p/ qualquer volume,
        // não limitado à 1ª página de pedidos como antes).
        const byStatus = statsResp.value.by_status || {};
        setPipelineCounts(byStatus);
        resolvedPendingCount = Number(byStatus.pending || 0);
        setPendingCount(resolvedPendingCount);
      }

      if (overviewResp.status === 'fulfilled') {
        const overview = overviewResp.value;
        const cv = overview?.conversations;
        const ov = overview?.orders;
        if (cv) setConversationsOpen(Number(cv.by_status?.open ?? cv.active ?? 0));
        if (ov) {
          resolvedPendingCount = Number(ov.by_status?.pending ?? 0);
          setPendingCount(resolvedPendingCount);
          if (!Number.isFinite(Number(statsResp.status === 'fulfilled' ? statsResp.value?.today_revenue : NaN))) {
            setRevenueToday(Number(ov.revenue_today ?? 0));
          }
          if (!Number.isFinite(Number(statsResp.status === 'fulfilled' ? statsResp.value?.total_orders : NaN))) {
            setOrdersToday(Number(ov.today ?? 0));
          }
        }
      }

      checkAndNotify(resolvedPendingCount);
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

      {storeId && (
        <OnboardingWizard open={wizardOpen} steps={buildWizardSteps(storeId)} onClose={() => setWizardOpen(false)} />
      )}
      <OnboardingChecklist onContinue={storeId ? () => setWizardOpen(true) : undefined} />

      {/* Detalhe do pedido em modal (aberto via ?pedido=<id> ao clicar numa linha) */}
      <OrderDetailModal onOrderChanged={handleOrderChanged} />

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
        <StatCard
          label="Pedidos hoje"
          value={loading ? '—' : ordersToday}
          sub={!loading && ordersToday === 0 ? 'Nenhum ainda' : undefined}
          onClick={() => navigate(`/stores/${storeRoute}/orders`)}
        />
        <StatCard
          label="Receita hoje"
          value={loading ? '—' : fmt(revenueToday)}
          tone="brand"
        />
        <StatCard
          label="Aguardando"
          value={loading ? '—' : pendingCount}
          tone={pendingCount > 0 ? 'warning' : 'default'}
          sub={pendingCount > 0 ? 'Precisam de confirmação' : 'Tudo em dia ✓'}
          onClick={() => navigate(`/stores/${storeRoute}/orders?status=pending`)}
        />
        <StatCard
          label="Conversas abertas"
          value={loading ? '—' : conversationsOpen}
          onClick={() => navigate('/conversations')}
        />
      </div>

      {/* ── Orders + Pipeline ── */}
      <div className="grid grid-cols-3 max-xl:grid-cols-1 gap-4">

        {/* Recent orders — 2/3 */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-token">
            <h2 className="text-sm font-semibold text-fg-token flex items-center gap-2">
              <FireIcon className="h-4 w-4 text-orange-400" />
              Pedidos recentes
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/stores/${storeRoute}/orders/new`)}
                className="flex items-center gap-1 text-xs bg-brand hover:bg-brand-hover text-white px-2.5 py-1.5 rounded font-medium transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Novo pedido
              </button>
              <button
                onClick={() => navigate(`/stores/${storeRoute}/orders`)}
                className="flex items-center gap-1 text-xs text-brand hover:underline font-medium"
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
                      advancing={advancing}
                      onAdvance={handleAdvance}
                      onOpen={openOrder}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pipeline — 1/3 */}
        <Card>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border-token">
            <TruckIcon className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-fg-token">Pipeline de pedidos</h2>
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
          <div className="px-5 py-3 border-t border-border-token">
            <button
              onClick={() => navigate(`/stores/${storeRoute}/orders`)}
              className="text-xs text-brand hover:underline flex items-center gap-1 font-medium"
            >
              Gerenciar todos <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
        </Card>

      </div>

      {/* ── Project health (admins only) ── */}
      {user?.is_staff && <Card>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border-token">
          <div className="flex items-center gap-2">
            <ServerStackIcon className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-fg-token">Saúde do sistema</h2>
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
            className="flex items-center gap-1 text-xs text-brand hover:underline font-medium"
          >
            Ver analytics <ArrowRightIcon className="h-3 w-3" />
          </button>
        </div>

        {healthLoading && !projectHealth ? (
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
                            <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(pct, 8)}%` }} />
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
        <button onClick={loadData} className="hover:text-brand underline transition-colors">
          atualizar agora
        </button>
      </p>

    </div>
  );
};

export default DashboardPage;
