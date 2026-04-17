/**
 * DashboardPage — Centro de operações da loja
 *
 * Desktop-first. Responde à pergunta que importa ao abrir o painel:
 * "O que precisa da minha atenção agora?"
 */
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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Badge, Button, Loading } from '../../components/common';
import { useStore } from '../../hooks';
import { getOrders, getOrderStats, updateOrderStatus, StoreOrder } from '../../services/storesApi';
import { dashboardService } from '../../services';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

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

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub, accent, onClick }) => (
  <div onClick={onClick} className={`flex-1 min-w-0 ${onClick ? 'cursor-pointer' : ''}`}>
  <Card
    className="h-full"
  >
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-2xl font-bold truncate ${accent ?? 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{sub}</p>}
      </div>
      <div className="shrink-0 p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-400">
        {icon}
      </div>
    </div>
  </Card>
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
  const { storeId, storeSlug } = useStore();
  const storeRoute = storeSlug || storeId || '';

  const [ordersToday, setOrdersToday]           = useState(0);
  const [revenueToday, setRevenueToday]         = useState(0);
  const [pendingCount, setPendingCount]         = useState(0);
  const [conversationsOpen, setConversationsOpen] = useState(0);
  const [recentOrders, setRecentOrders]         = useState<StoreOrder[]>([]);
  const [pipelineCounts, setPipelineCounts]     = useState<Record<string, number>>({});
  const [loading, setLoading]                   = useState(true);
  const [advancing, setAdvancing]               = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt]           = useState(new Date());

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [ordersResp, statsResp, overviewResp] = await Promise.allSettled([
        getOrders({ store: storeId }),
        getOrderStats(storeId),
        dashboardService.getOverview({ store: storeId }),
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
        setOrdersToday(statsResp.value.total_orders);
        setRevenueToday(statsResp.value.today_revenue);
      }

      if (overviewResp.status === 'fulfilled') {
        const cv = overviewResp.value?.conversations;
        if (cv) setConversationsOpen(cv.by_status?.open ?? cv.active ?? 0);
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
      {(pendingCount > 0 || conversationsOpen > 0) && !loading && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl
                        bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <div className="flex flex-wrap gap-4 flex-1 text-sm font-medium text-yellow-800 dark:text-yellow-300">
            {pendingCount > 0 && (
              <button
                onClick={() => navigate(`/stores/${storeRoute}/orders?status=pending`)}
                className="hover:underline"
              >
                <strong>{pendingCount}</strong> pedido{pendingCount > 1 ? 's' : ''} aguardando confirmação
              </button>
            )}
            {conversationsOpen > 0 && (
              <button onClick={() => navigate('/conversations')} className="hover:underline">
                <strong>{conversationsOpen}</strong> conversa{conversationsOpen > 1 ? 's' : ''} abertas
              </button>
            )}
          </div>
          <button
            onClick={loadData}
            title="Atualizar"
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 p-1 rounded transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          icon={<ShoppingCartIcon className="h-5 w-5" />}
          label="Pedidos hoje"
          value={loading ? '—' : ordersToday}
          onClick={() => navigate(`/stores/${storeRoute}/orders`)}
        />
        <KpiCard
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          label="Receita hoje"
          value={loading ? '—' : fmt(revenueToday)}
          accent="text-green-600 dark:text-green-400"
        />
        <KpiCard
          icon={<ClockIcon className="h-5 w-5" />}
          label="Pendentes"
          value={loading ? '—' : pendingCount}
          accent={pendingCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : undefined}
          sub={pendingCount > 0 ? 'Aguardando confirmação' : 'Tudo em dia ✓'}
          onClick={() => navigate(`/stores/${storeRoute}/orders?status=pending`)}
        />
        <KpiCard
          icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
          label="Conversas abertas"
          value={loading ? '—' : conversationsOpen}
          accent={conversationsOpen > 0 ? 'text-blue-600 dark:text-blue-400' : undefined}
          onClick={() => navigate('/conversations')}
        />
      </div>

      {/* ── Orders + Pipeline ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Recent orders — 2/3 */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FireIcon className="h-4 w-4 text-orange-400" />
              Pedidos recentes
            </h2>
            <button
              onClick={() => navigate(`/stores/${storeRoute}/orders`)}
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Ver todos <ArrowRightIcon className="h-3 w-3" />
            </button>
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
          <div className="p-5 space-y-4">
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
                      <span className="text-xs font-medium text-gray-600 dark:text-zinc-400
                                       group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {label}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: count > 0 ? `${Math.max(pct, 5)}%` : '0%' }}
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
