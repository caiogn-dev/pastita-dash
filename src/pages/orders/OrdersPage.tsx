import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  TruckIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SignalIcon,
  SignalSlashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { OrderStatusBadge, PageLoading } from '../../components/common';
import { getErrorMessage, ordersService } from '../../services';
import { useNotificationSound, useOrdersWebSocket, useStore } from '../../hooks';
import { Order } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '',                label: 'Todos',       icon: null },
  { key: 'pending',         label: 'Pendentes',   icon: ClockIcon },
  { key: 'confirmed',       label: 'Confirmados', icon: CheckCircleIcon },
  { key: 'preparing',       label: 'Preparando',  icon: FireIcon },
  { key: 'out_for_delivery',label: 'A caminho',   icon: TruckIcon },
  { key: 'delivered',       label: 'Entregues',   icon: CheckCircleIcon },
  { key: 'cancelled',       label: 'Cancelados',  icon: XCircleIcon },
] as const;

const NEXT_ACTION: Record<string, { label: string; next: string; color: string }> = {
  pending:          { label: 'Confirmar',       next: 'confirmed',       color: 'bg-blue-600 hover:bg-blue-700' },
  confirmed:        { label: 'Iniciar preparo', next: 'preparing',       color: 'bg-orange-600 hover:bg-orange-700' },
  preparing:        { label: 'Despachar',       next: 'out_for_delivery',color: 'bg-indigo-600 hover:bg-indigo-700' },
  out_for_delivery: { label: 'Entregue',        next: 'delivered',       color: 'bg-green-600 hover:bg-green-700' },
};

const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMoney = (value: number | string | null | undefined) => {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM HH:mm', { locale: ptBR });
};

const mergeOrder = (list: Order[], incoming: Order) => {
  const idx = list.findIndex((o) => o.id === incoming.id);
  if (idx === -1) return [incoming, ...list];
  const next = [...list];
  next[idx] = { ...next[idx], ...incoming };
  return next;
};

const patchOrder = (list: Order[], id: string | undefined, patch: Partial<Order>) => {
  if (!id) return list;
  return list.map((o) => (o.id === id ? { ...o, ...patch } : o));
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string | number; sub?: string; dot: string }> = ({
  label, value, sub, dot,
}) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
  </div>
);

const Pagination: React.FC<{
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}> = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
      <span className="text-xs text-zinc-500">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-zinc-600 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId, storeSlug } = useStore();

  const statusFilter = searchParams.get('status') ?? '';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

  const setStatusFilter = (s: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s) next.set('status', s); else next.delete('status');
      next.delete('page');
      return next;
    });
  };

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p)); else next.delete('page');
      return next;
    });
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const { playNotificationSound } = useNotificationSound();

  const storeQuery = storeSlug || storeId;

  const loadOrders = useCallback(
    async (background = false) => {
      if (!storeQuery) { setLoading(false); return; }
      background ? setRefreshing(true) : setLoading(true);
      try {
        const res = await ordersService.getOrders({ store: storeQuery });
        setOrders(res.results || []);
        setLastSync(new Date());
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storeQuery]
  );

  const scheduleReload = useCallback((delay = 1200) => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => loadOrders(true), delay);
  }, [loadOrders]);

  useEffect(() => { loadOrders(false); }, [loadOrders]);
  useEffect(() => () => { if (refreshTimer.current) window.clearTimeout(refreshTimer.current); }, []);

  const applyPatch = useCallback((payload: { order_id?: string; status?: string; payment_status?: string; updated_at?: string }) => {
    setOrders((cur) => patchOrder(cur, payload.order_id, {
      status: payload.status as Order['status'] | undefined,
      payment_status: payload.payment_status as Order['payment_status'] | undefined,
      updated_at: payload.updated_at,
    }));
    setLastSync(new Date());
  }, []);

  const {
    isConnected: rtConnected,
    connectionError,
    reconnect,
  } = useOrdersWebSocket({
    enabled: Boolean(storeQuery),
    onOrderCreated: (p) => {
      playNotificationSound();
      toast.success(`Novo pedido #${p.order_number || p.order_id?.slice(0, 8)}`);
      scheduleReload(250);
    },
    onOrderUpdated: (p) => { applyPatch(p); scheduleReload(1400); },
    onOrderCancelled: (p) => {
      applyPatch(p);
      toast.error(`Pedido cancelado #${p.order_number || p.order_id?.slice(0, 8)}`);
      scheduleReload(1400);
    },
    onPaymentReceived: (p) => {
      playNotificationSound();
      applyPatch({ ...p, payment_status: 'paid' });
      toast.success(`Pagamento confirmado #${p.order_number || p.order_id?.slice(0, 8)}`);
      scheduleReload(900);
    },
  });

  const filtered = useMemo(() =>
    orders.filter((o) => {
      const matchStatus = !statusFilter || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q);
      return matchStatus && matchSearch;
    }),
    [orders, statusFilter, search]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { '': orders.length };
    STATUS_TABS.forEach(({ key }) => {
      if (key) c[key] = orders.filter((o) => o.status === key).length;
    });
    return c;
  }, [orders]);

  const kpis = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'pending').length,
    active: orders.filter((o) => ['confirmed', 'preparing'].includes(o.status)).length,
    enRoute: orders.filter((o) => o.status === 'out_for_delivery').length,
    revenue: orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total || 0), 0),
  }), [orders]);

  const page = Math.max(1, pageParam);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleAdvance = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    setAdvancingId(order.id);
    try {
      const updated = await ordersService.updateStatus(order.id, action.next as Order['status']);
      setOrders((cur) => mergeOrder(cur, updated));
      setLastSync(new Date());
      toast.success(`Pedido #${order.order_number} → ${action.label}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdvancingId(null);
    }
  };

  if (loading) return <PageLoading />;

  if (!storeQuery) {
    return (
      <div className="p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-4">Selecione uma loja para ver os pedidos.</p>
          <button
            onClick={() => navigate('/stores')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ir para lojas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Pendentes" value={kpis.pending} sub="Aguardando confirmação" dot="bg-yellow-400" />
        <KpiCard label="Em produção" value={kpis.active} sub="Confirmados + preparando" dot="bg-orange-400" />
        <KpiCard label="A caminho" value={kpis.enRoute} sub="Saiu para entrega" dot="bg-indigo-400" />
        <KpiCard label="Receita paga" value={`R$ ${formatMoney(kpis.revenue)}`} sub="Pedidos com pagamento confirmado" dot="bg-green-400" />
      </div>

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">Pedidos</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            rtConnected ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500'
          }`}>
            {rtConnected ? <SignalIcon className="h-3 w-3" /> : <SignalSlashIcon className="h-3 w-3" />}
            {rtConnected ? 'Ao vivo' : 'Offline'}
          </span>
          {lastSync && (
            <span className="text-xs text-zinc-600">
              {format(lastSync, 'HH:mm:ss', { locale: ptBR })}
            </span>
          )}
          {!rtConnected && connectionError && (
            <button
              onClick={() => reconnect()}
              className="text-xs text-orange-400 hover:text-orange-300 underline"
            >
              Reconectar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar pedido ou cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUS_TABS.map(({ key, label, icon: Icon }) => {
          const count = counts[key] ?? 0;
          const active = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Entrega</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Horário</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {paginated.map((order) => {
                  const action = NEXT_ACTION[order.status];
                  const isAdvancing = advancingId === order.id;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/stores/${storeId || storeSlug}/orders/${order.id}`)}
                      className="cursor-pointer hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">#{order.order_number}</span>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {order.items_count ?? order.items?.length ?? 0} item(s)
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{order.customer_name || '—'}</span>
                        <p className="text-xs text-zinc-500 mt-0.5">{order.customer_phone || ''}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-zinc-400">
                          {order.delivery_address ? 'Entrega' : 'Retirada'}
                        </span>
                        {order.delivery_fee ? (
                          <p className="text-xs text-zinc-600 mt-0.5">R$ {formatMoney(order.delivery_fee)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="font-semibold text-white">R$ {formatMoney(order.total)}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs text-zinc-500">{formatTime(order.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {action ? (
                          <button
                            onClick={(e) => handleAdvance(e, order)}
                            disabled={isAdvancing}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60 ${action.color}`}
                          >
                            {isAdvancing ? (
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckIcon className="h-3.5 w-3.5" />
                            )}
                            {action.label}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </div>

    </div>
  );
};

export default OrdersPage;
