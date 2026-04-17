import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  CheckIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ArrowPathIcon,
  PrinterIcon,
  TruckIcon,
  ShoppingBagIcon,
  BellAlertIcon,
  SignalIcon,
  SignalSlashIcon,
  ShoppingCartIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, Modal, PageLoading } from '../../components/common';
import { ordersService } from '../../services';
import { useNotificationSound, useOrdersWebSocket, useStore } from '../../hooks';
import { Order } from '../../types';
import { useOrderPrint } from '../../components/orders/OrderPrint';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id: 'confirmed',
    label: 'Confirmado',
    statuses: ['confirmed', 'processing'],
    borderColor: 'border-t-blue-400',
    dotColor: 'bg-blue-400',
    labelColor: 'text-blue-700 dark:text-blue-300',
    nextStatus: 'preparing',
    nextLabel: 'Iniciar Preparo',
    advanceColor: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    id: 'preparing',
    label: 'Preparando',
    statuses: ['preparing'],
    borderColor: 'border-t-orange-400',
    dotColor: 'bg-orange-400',
    labelColor: 'text-orange-700 dark:text-orange-300',
    nextStatus: null, // dynamic per order
    nextLabel: '',
    advanceColor: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    id: 'dispatch',
    label: 'Em Entrega / Retirada',
    statuses: ['out_for_delivery', 'ready', 'shipped'],
    borderColor: 'border-t-indigo-400',
    dotColor: 'bg-indigo-400',
    labelColor: 'text-indigo-700 dark:text-indigo-300',
    nextStatus: 'delivered',
    nextLabel: 'Entregue ✓',
    advanceColor: 'bg-green-500 hover:bg-green-600',
  },
  {
    id: 'done',
    label: 'Entregue',
    statuses: ['delivered', 'completed'],
    borderColor: 'border-t-green-400',
    dotColor: 'bg-green-400',
    labelColor: 'text-green-700 dark:text-green-300',
    nextStatus: null,
    nextLabel: '',
    advanceColor: '',
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

const getNextAction = (order: Order): { status: string; label: string; color: string } | null => {
  switch (order.status) {
    case 'confirmed':
    case 'processing':
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

const needsPayment = (order: Order) =>
  order.payment_status !== 'paid' &&
  ['cash', 'money', 'dinheiro', 'pagar_na_retirada', 'pay_on_pickup', 'pix_on_delivery'].some(
    m => order.payment_method?.toLowerCase().includes(m) ?? false
  );

const parseAddress = (addr: unknown): string => {
  if (!addr) return '';
  if (typeof addr === 'string') {
    try {
      const a = JSON.parse(addr);
      return [a.street, a.number, a.neighborhood, a.city].filter(Boolean).join(', ');
    } catch { return addr; }
  }
  const a = addr as Record<string, string>;
  return [a.street, a.number, a.neighborhood, a.city].filter(Boolean).join(', ');
};

// ─── OrderDetailModal ─────────────────────────────────────────────────────────

interface DetailModalProps {
  order: Order;
  onClose: () => void;
  onAdvance: (order: Order) => void;
  onPay: (order: Order) => void;
}

const OrderDetailModal: React.FC<DetailModalProps> = ({ order, onClose, onAdvance, onPay }) => {
  const { printOrder } = useOrderPrint();
  const action = getNextAction(order);
  const hasPendingPayment = needsPayment(order);

  return (
    <Modal isOpen onClose={onClose} title={`Pedido #${order.order_number}`} size="md">
      <div className="space-y-4 -mt-2">

        {/* Print + time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-zinc-500">{timeAgo(order.created_at)}</span>
          <button
            onClick={() => printOrder(order as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <PrinterIcon className="h-3.5 w-3.5" />
            Imprimir comanda
          </button>
        </div>

        {/* Customer */}
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Cliente</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.customer_name || '—'}</p>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
              <PhoneIcon className="h-3 w-3" />
              {order.customer_phone}
            </a>
          )}
        </div>

        {/* Delivery */}
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Entrega</p>
          {order.delivery_method === 'pickup' ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-400">
              <ShoppingBagIcon className="h-4 w-4" />
              Retirada no local
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
                <TruckIcon className="h-4 w-4" />
                Delivery
              </div>
              {order.delivery_address && (
                <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <MapPinIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{parseAddress(order.delivery_address)}</span>
                </div>
              )}
              {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                <p className="text-xs text-gray-400 dark:text-zinc-500">Taxa: R$ {fmt(order.delivery_fee)}</p>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Itens do pedido</p>
          <div className="space-y-1.5">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-start justify-between text-sm gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.quantity}× {item.product_name}
                  </span>
                  {item.notes && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 pl-3">↳ {item.notes}</p>
                  )}
                </div>
                <span className="text-gray-600 dark:text-zinc-400 shrink-0 tabular-nums text-xs">
                  R$ {fmt(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Total</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">R$ {fmt(order.total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">Pagamento</p>
            <p className="text-xs text-gray-600 dark:text-zinc-300 capitalize">{order.payment_method || 'Não informado'}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            order.payment_status === 'paid'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
          </span>
        </div>

        {/* Actions */}
        {(action || hasPendingPayment) && (
          <div className="flex gap-2 pt-1">
            {hasPendingPayment && (
              <button
                onClick={() => { onPay(order); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                Marcar como Pago
              </button>
            )}
            {action && (
              <button
                onClick={() => { onAdvance(order); onClose(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${action.color}`}
              >
                <CheckIcon className="h-4 w-4" />
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface CardProps {
  order: Order;
  advancing: boolean;
  paying: boolean;
  cancelling: boolean;
  onAdvance: (o: Order) => void;
  onPay: (o: Order) => void;
  onCancel: (o: Order) => void;
  onDetail: (o: Order) => void;
}

const OrderCard: React.FC<CardProps> = ({
  order, advancing, paying, cancelling, onAdvance, onPay, onCancel, onDetail,
}) => {
  const action = getNextAction(order);
  const hasPendingPayment = needsPayment(order);

  const itemsSummary = useMemo(() => {
    if (!order.items?.length) return `${order.items_count ?? 0} item(s)`;
    return order.items.map(i => `${i.quantity}× ${i.product_name}`).join(' · ');
  }, [order.items, order.items_count]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.order_number}</span>
          {order.delivery_method === 'pickup' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium whitespace-nowrap">
              Retirada
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium whitespace-nowrap">
              Delivery
            </span>
          )}
          {hasPendingPayment && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium whitespace-nowrap">
              $ Pend.
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 dark:text-zinc-600 shrink-0 mt-0.5">{timeAgo(order.created_at)}</span>
      </div>

      {/* Customer */}
      <div>
        <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight truncate">
          {order.customer_name || 'Cliente'}
        </p>
        {order.customer_phone && (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500">{order.customer_phone}</p>
        )}
      </div>

      {/* Items */}
      <p className="text-[11px] text-gray-500 dark:text-zinc-500 leading-snug line-clamp-2">{itemsSummary}</p>

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900 dark:text-white">R$ {fmt(order.total)}</span>
        {order.delivery_fee && Number(order.delivery_fee) > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-zinc-600">
            +R$ {fmt(order.delivery_fee)} entrega
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 dark:border-zinc-800">

        {/* Details eye */}
        <button
          onClick={() => onDetail(order)}
          title="Ver detalhes"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <EyeIcon className="h-4 w-4" />
        </button>

        {/* Advance status */}
        {action ? (
          <button
            onClick={() => onAdvance(order)}
            disabled={advancing}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-60 ${action.color}`}
          >
            {advancing
              ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              : <CheckIcon className="h-3.5 w-3.5" />
            }
            <span className="truncate">{action.label}</span>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {/* Pay */}
        {hasPendingPayment && (
          <button
            onClick={() => onPay(order)}
            disabled={paying}
            title="Lançar pagamento"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-60"
          >
            {paying
              ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              : <CurrencyDollarIcon className="h-4 w-4" />
            }
          </button>
        )}

        {/* Cancel */}
        <button
          onClick={() => onCancel(order)}
          disabled={cancelling}
          title="Cancelar pedido"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-red-100 dark:border-red-900/30 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
        >
          <XMarkIcon className="h-4 w-4" />
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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const { playNotificationSound } = useNotificationSound();

  const loadOrders = useCallback(async (bg = false) => {
    if (!storeQuery) { setLoading(false); return; }
    bg ? setRefreshing(true) : setLoading(true);
    try {
      const res = await ordersService.getOrders({ store_slug: storeQuery });
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

  const patchOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    setLastSync(new Date());
  }, []);

  const handleAdvance = useCallback(async (order: Order) => {
    const action = getNextAction(order);
    if (!action) return;
    setAdvancingId(order.id);
    try {
      await ordersService.updateStatus(order.id, action.status);
      patchOrder(order.id, { status: action.status as Order['status'] });
      toast.success(`#${order.order_number} → ${action.label}`);
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setAdvancingId(null);
    }
  }, [patchOrder]);

  const handlePay = useCallback(async (order: Order) => {
    setPayingId(order.id);
    try {
      await ordersService.markPaid(order.id, storeQuery || undefined);
      patchOrder(order.id, { payment_status: 'paid' });
      toast.success(`Pagamento lançado #${order.order_number}`);
    } catch {
      toast.error('Erro ao lançar pagamento');
    } finally {
      setPayingId(null);
    }
  }, [patchOrder, storeQuery]);

  const handleCancel = useCallback(async (order: Order) => {
    if (!window.confirm(`Cancelar pedido #${order.order_number}?`)) return;
    setCancellingId(order.id);
    try {
      await ordersService.cancelOrder(order.id, storeQuery || undefined);
      patchOrder(order.id, { status: 'cancelled' });
      toast.success(`Pedido #${order.order_number} cancelado`);
    } catch {
      toast.error('Erro ao cancelar pedido');
    } finally {
      setCancellingId(null);
    }
  }, [patchOrder, storeQuery]);

  const pendingOrders = useMemo(
    () => orders.filter(o => o.status === 'pending'),
    [orders]
  );

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
    <div className="flex flex-col gap-4 h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pedidos</h1>
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
        <button
          onClick={() => loadOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── Pending strip ── */}
      {pendingOrders.length > 0 && (
        <div className="shrink-0 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <BellAlertIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              {pendingOrders.length} novo{pendingOrders.length > 1 ? 's' : ''} pedido{pendingOrders.length > 1 ? 's' : ''} aguardando
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {pendingOrders.map(order => (
              <div
                key={order.id}
                className="shrink-0 flex items-center gap-3 bg-white dark:bg-zinc-900 border border-yellow-200 dark:border-yellow-800/30 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">#{order.order_number}</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">{order.customer_name}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">R$ {fmt(order.total)}</span>
                <button
                  onClick={() => handleAdvance(order)}
                  disabled={advancingId === order.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {advancingId === order.id
                    ? <ArrowPathIcon className="h-3 w-3 animate-spin" />
                    : <CheckIcon className="h-3 w-3" />
                  }
                  Confirmar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2×2 Kanban grid ── */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {columnData.map(col => (
          <div
            key={col.id}
            className="flex flex-col rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/40 overflow-hidden"
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b-2 ${col.borderColor}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                <span className={`text-sm font-semibold ${col.labelColor}`}>{col.label}</span>
              </div>
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center">
                {col.orders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {col.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
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
                    onDetail={setDetailOrder}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail modal ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onAdvance={(o) => { handleAdvance(o); setDetailOrder(null); }}
          onPay={(o) => { handlePay(o); setDetailOrder(null); }}
        />
      )}
    </div>
  );
};

export default OrdersPage;
