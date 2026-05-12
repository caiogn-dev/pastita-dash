import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  CheckIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ArrowPathIcon,
  SignalIcon,
  SignalSlashIcon,
  ShoppingCartIcon,
  TruckIcon,
  HomeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, PageLoading } from '../../components/common';
import {
  getOrders,
  updateOrderStatus,
  markOrderPaid,
  cancelOrder,
  StoreOrder,
} from '../../services/storesApi';
import { useNotificationSound, useOrdersWebSocket, useStore } from '../../hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id: 'pending',
    label: 'Pendente',
    statuses: ['pending', 'processing'],
    borderColor: 'border-t-yellow-400',
    dotColor: 'bg-yellow-400',
    labelColor: 'text-yellow-700 dark:text-yellow-300',
  },
  {
    id: 'confirmed',
    label: 'Confirmado',
    statuses: ['confirmed'],
    borderColor: 'border-t-blue-400',
    dotColor: 'bg-blue-400',
    labelColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    id: 'preparing',
    label: 'Preparando',
    statuses: ['preparing'],
    borderColor: 'border-t-orange-400',
    dotColor: 'bg-orange-400',
    labelColor: 'text-orange-700 dark:text-orange-300',
  },
  {
    id: 'dispatch',
    label: 'Em Entrega / Retirada',
    statuses: ['out_for_delivery', 'ready', 'shipped'],
    borderColor: 'border-t-indigo-400',
    dotColor: 'bg-indigo-400',
    labelColor: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    id: 'done',
    label: 'Entregue',
    statuses: ['delivered', 'completed'],
    borderColor: 'border-t-green-400',
    dotColor: 'bg-green-400',
    labelColor: 'text-green-700 dark:text-green-300',
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const timeAgo = (date?: string | null) => {
  if (!date) return '';
  try { return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true }); }
  catch { return ''; }
};

const getElapsedMinutes = (createdAt?: string | null): number => {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
};

type ElapsedUrgency = 'ok' | 'warning' | 'critical';
const getElapsedUrgency = (minutes: number, status: string): ElapsedUrgency => {
  if (['delivered', 'completed', 'cancelled'].includes(status)) return 'ok';
  if (minutes >= 40) return 'critical';
  if (minutes >= 20) return 'warning';
  return 'ok';
};

const formatElapsed = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
};

const getNextAction = (order: StoreOrder): { status: string; label: string; color: string } | null => {
  switch (order.status) {
    case 'pending':
    case 'processing':
      return { status: 'confirmed', label: 'Confirmar', color: 'bg-blue-500 hover:bg-blue-600' };
    case 'confirmed':
      return { status: 'preparing', label: 'Preparar', color: 'bg-orange-500 hover:bg-orange-600' };
    case 'preparing':
      if (order.delivery_method === 'pickup' || order.delivery_method === 'digital') {
        return { status: 'ready', label: 'Pronto p/ Retirada', color: 'bg-indigo-500 hover:bg-indigo-600' };
      }
      return { status: 'out_for_delivery', label: 'Saiu p/ Entrega', color: 'bg-indigo-500 hover:bg-indigo-600' };
    case 'out_for_delivery':
    case 'ready':
    case 'shipped':
      return { status: 'delivered', label: 'Entregue ✓', color: 'bg-green-500 hover:bg-green-600' };
    default:
      return null;
  }
};

const needsPayment = (order: StoreOrder) =>
  order.payment_status !== 'paid' &&
  ['cash', 'money', 'dinheiro', 'pagar_na_retirada', 'pay_on_pickup', 'pix_on_delivery'].some(
    m => (order.payment_method ?? '').toLowerCase().includes(m)
  );

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface CardProps {
  order: StoreOrder;
  advancing: boolean;
  paying: boolean;
  cancelling: boolean;
  onAdvance: (o: StoreOrder) => void;
  onPay: (o: StoreOrder) => void;
  onCancel: (o: StoreOrder) => void;
  onDetail: (o: StoreOrder) => void;
}

const OrderCard: React.FC<CardProps> = ({
  order, advancing, paying, cancelling, onAdvance, onPay, onCancel, onDetail,
}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const action = getNextAction(order);
  const hasPendingPayment = needsPayment(order);
  const elapsed = getElapsedMinutes(order.created_at);
  const urgency = getElapsedUrgency(elapsed, order.status);
  const isPickup = order.delivery_method === 'pickup' || order.delivery_method === 'digital';

  const urgencyBorder =
    urgency === 'critical' ? 'border-red-400 dark:border-red-700' :
    urgency === 'warning'  ? 'border-yellow-400 dark:border-yellow-600' :
    'border-black/5 dark:border-white/5';

  return (
    <div
      onClick={() => onDetail(order)}
      className={`cursor-pointer rounded-xl border-2 bg-white/92 p-2 transition-shadow hover:shadow-[0_10px_30px_rgba(15,15,15,0.08)] dark:bg-zinc-900 ${urgencyBorder} ${urgency === 'critical' ? 'animate-pulse' : ''}`}
    >
      {/* top row: order # + elapsed + delivery type */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 font-mono">
          #{order.order_number}
        </span>
        <div className="flex items-center gap-1.5">
          {elapsed > 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              urgency === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              urgency === 'warning'  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>
              <ClockIcon className="h-2.5 w-2.5" />
              {formatElapsed(elapsed)}
            </span>
          )}
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            isPickup ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {isPickup ? <HomeIcon className="h-2.5 w-2.5" /> : <TruckIcon className="h-2.5 w-2.5" />}
            {isPickup ? 'Retirada' : 'Delivery'}
          </span>
        </div>
      </div>

      {/* customer + value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="truncate text-[12px] font-semibold leading-tight text-gray-900 dark:text-white">
          {order.customer_name || 'Cliente'}
        </p>
        <p className="shrink-0 text-[14px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
          R$ {fmt(order.total)}
        </p>
      </div>

      {/* action buttons row — stop click propagation so card click (detail) doesn't fire */}
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {hasPendingPayment && (
          <button
            onClick={() => onPay(order)}
            disabled={paying}
            title="Lançar pagamento"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-600 transition-colors hover:bg-green-100 disabled:opacity-60 dark:bg-green-900/20 dark:text-green-400"
          >
            {paying ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CurrencyDollarIcon className="h-3.5 w-3.5" />}
          </button>
        )}

        {action && (
          <button
            onClick={() => onAdvance(order)}
            disabled={advancing}
            className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-colors disabled:opacity-60 ${action.color}`}
          >
            {advancing ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
            <span className="truncate">{action.label}</span>
          </button>
        )}

        <button
          onClick={() => onCancel(order)}
          disabled={cancelling}
          title="Cancelar pedido"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-100 text-red-400 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900/30 dark:text-red-500"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId, storeSlug } = useStore();
  const storeQuery = storeSlug || storeId;
  const orderCreateRoute = storeQuery ? `/stores/${storeQuery}/orders/new` : null;

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const { playNotificationSound } = useNotificationSound();

  const loadOrders = useCallback(async (bg = false) => {
    if (!storeQuery) { setLoading(false); return; }
    bg ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getOrders({ store: storeQuery, page_size: 500 });
      setOrders(res.results ?? []);
      setLastSync(new Date());
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeQuery]);

  const scheduleReload = useCallback((delay = 1000) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => loadOrders(true), delay);
  }, [loadOrders]);

  useEffect(() => { loadOrders(false); }, [loadOrders]);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const { isConnected: rtConnected } = useOrdersWebSocket({
    enabled: Boolean(storeQuery),
    onOrderCreated: (p) => {
      playNotificationSound();
      toast.success(`Novo pedido #${p.order_number || p.order_id?.slice(0, 6)}`);
      scheduleReload(300);
    },
    onOrderUpdated: () => scheduleReload(800),
    onOrderCancelled: (p) => {
      toast.error(`Cancelado #${p.order_number || p.order_id?.slice(0, 6)}`);
      scheduleReload(800);
    },
    onPaymentReceived: (p) => {
      playNotificationSound();
      toast.success(`Pago #${p.order_number || p.order_id?.slice(0, 6)}`);
      scheduleReload(500);
    },
  });

  const patchOrder = useCallback((id: string, patch: Partial<StoreOrder>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    setLastSync(new Date());
  }, []);

  const handleAdvance = useCallback(async (order: StoreOrder) => {
    const action = getNextAction(order);
    if (!action) return;
    setAdvancingId(order.id);
    try {
      await updateOrderStatus(order.id, action.status);
      patchOrder(order.id, { status: action.status });
      toast.success(`#${order.order_number} → ${action.label}`);
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setAdvancingId(null);
    }
  }, [patchOrder]);

  const handlePay = useCallback(async (order: StoreOrder) => {
    setPayingId(order.id);
    try {
      await markOrderPaid(order.id);
      patchOrder(order.id, { payment_status: 'paid' });
      toast.success(`Pagamento lançado #${order.order_number}`);
    } catch {
      toast.error('Erro ao lançar pagamento');
    } finally {
      setPayingId(null);
    }
  }, [patchOrder]);

  const handleCancel = useCallback(async (order: StoreOrder) => {
    if (!window.confirm(`Cancelar pedido #${order.order_number}?`)) return;
    setCancellingId(order.id);
    try {
      await cancelOrder(order.id);
      patchOrder(order.id, { status: 'cancelled' });
      toast.success(`Pedido #${order.order_number} cancelado`);
    } catch {
      toast.error('Erro ao cancelar pedido');
    } finally {
      setCancellingId(null);
    }
  }, [patchOrder]);

  const handleNewOrder = useCallback(() => {
    if (orderCreateRoute) navigate(orderCreateRoute);
  }, [navigate, orderCreateRoute]);

  const columnData = useMemo(
    () => COLUMNS.map(col => ({
      ...col,
      orders: orders.filter(o => (col.statuses as readonly string[]).includes(o.status)),
    })),
    [orders]
  );

  if (loading) return <PageLoading />;

  if (!storeQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500 dark:text-zinc-400">Selecione uma loja para ver os pedidos.</p>
        <Button onClick={() => navigate('/stores')}>Selecionar loja</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-[#f5f1e8] px-2 py-2 text-fg-primary dark:bg-[#050505] sm:px-3 sm:py-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/5 dark:bg-white/5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-900 dark:text-white">Pedidos</h1>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            rtConnected
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500'
          }`}>
            {rtConnected ? <SignalIcon className="h-3 w-3" /> : <SignalSlashIcon className="h-3 w-3" />}
            {rtConnected ? 'Ao vivo' : 'Offline'}
          </span>
          {lastSync && (
            <span className="text-xs text-gray-400 dark:text-zinc-600">
              {format(lastSync, 'HH:mm:ss', { locale: ptBR })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {orderCreateRoute && (
            <button
              onClick={handleNewOrder}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              Novo pedido
            </button>
          )}
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:grid-cols-5 max-xl:grid-cols-2">
        {columnData.map(col => (
          <div
            key={col.id}
            className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/85 dark:border-zinc-800 dark:bg-zinc-950/40 xl:min-h-[calc(100vh-5.75rem)]"
          >
            <div className={`flex items-center justify-between border-b bg-white/85 px-3 py-2 dark:bg-zinc-900 ${col.borderColor}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${col.labelColor}`}>{col.label}</span>
              </div>
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center">
                {col.orders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {col.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCartIcon className="h-7 w-7 text-gray-200 dark:text-zinc-700 mb-2" />
                  <p className="text-xs text-gray-300 dark:text-zinc-700">Vazio</p>
                </div>
              ) : (
                col.orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    advancing={advancingId === order.id}
                    paying={payingId === order.id}
                    cancelling={cancellingId === order.id}
                    onAdvance={handleAdvance}
                    onPay={handlePay}
                    onCancel={handleCancel}
                    onDetail={(o) => navigate(`/stores/${storeQuery}/orders/${o.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default OrdersPage;
