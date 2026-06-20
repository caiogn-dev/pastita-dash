import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewOrderDrawer } from '../../components/orders/NewOrderDrawer';
import { OrderDeliveryModal } from '../../components/OrderDeliveryModal';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
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
  PhoneIcon,
  FireIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
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
import { useNotificationSound, useOrdersWebSocket, useStore, useConfirm } from '../../hooks';
import { getErrorMessage } from '../../services';

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id: 'pending',
    label: 'Recebido',
    description: 'Aguardando confirmação',
    statuses: ['pending', 'processing', 'awaiting_payment', 'payment_pending'],
    headerBg: 'bg-slate-600',
    borderTop: 'border-t-slate-400',
    dotColor: 'bg-slate-400',
    colBg: 'bg-slate-50/80 dark:bg-zinc-950/40',
    Icon: ClockIcon,
  },
  {
    id: 'confirmed',
    label: 'Confirmado',
    description: 'Pronto para produção',
    statuses: ['confirmed', 'paid', 'payment_confirmed'],
    headerBg: 'bg-blue-600',
    borderTop: 'border-t-blue-400',
    dotColor: 'bg-blue-400',
    colBg: 'bg-blue-50/60 dark:bg-zinc-950/40',
    Icon: CheckCircleIcon,
  },
  {
    id: 'preparing',
    label: 'Preparando',
    description: 'Em produção na cozinha',
    statuses: ['preparing'],
    headerBg: 'bg-orange-500',
    borderTop: 'border-t-orange-400',
    dotColor: 'bg-orange-400',
    colBg: 'bg-orange-50/60 dark:bg-zinc-950/40',
    Icon: FireIcon,
  },
  {
    id: 'dispatch',
    label: 'Em Entrega',
    description: 'Saiu / Pronto p/ retirada',
    statuses: ['out_for_delivery', 'ready', 'shipped'],
    headerBg: 'bg-indigo-600',
    borderTop: 'border-t-indigo-400',
    dotColor: 'bg-indigo-400',
    colBg: 'bg-indigo-50/60 dark:bg-zinc-950/40',
    Icon: TruckIcon,
  },
  {
    id: 'done',
    label: 'Entregue',
    description: 'Pedido finalizado',
    statuses: ['delivered', 'completed'],
    headerBg: 'bg-emerald-600',
    borderTop: 'border-t-emerald-400',
    dotColor: 'bg-emerald-400',
    colBg: 'bg-emerald-50/60 dark:bg-zinc-950/40',
    Icon: HomeIcon,
  },
] as const;

type ColumnId = typeof COLUMNS[number]['id'];

// ─── Status → column mapping ──────────────────────────────────────────────────

const statusToColumn = (status: string): ColumnId => {
  const s = status.toLowerCase();
  for (const col of COLUMNS) {
    if ((col.statuses as readonly string[]).includes(s)) return col.id;
  }
  return 'pending';
};

// Next status for advance button
const getNextAction = (order: StoreOrder): { status: string; label: string; color: string } | null => {
  switch (order.status) {
    case 'pending': case 'processing':
      return { status: 'confirmed', label: 'Confirmar', color: 'bg-blue-500 hover:bg-blue-600' };
    case 'confirmed': case 'paid':
      return { status: 'preparing', label: 'Preparar', color: 'bg-orange-500 hover:bg-orange-600' };
    case 'preparing':
      return order.delivery_method === 'pickup' || order.delivery_method === 'digital'
        ? { status: 'ready',            label: 'Pronto p/ Retirada', color: 'bg-indigo-500 hover:bg-indigo-600' }
        : { status: 'out_for_delivery', label: 'Saiu p/ Entrega',    color: 'bg-indigo-500 hover:bg-indigo-600' };
    case 'out_for_delivery': case 'ready': case 'shipped':
      return { status: 'delivered', label: 'Entregue ✓', color: 'bg-emerald-500 hover:bg-emerald-600' };
    default:
      return null;
  }
};

const needsPayment = (order: StoreOrder) =>
  order.payment_status !== 'paid' &&
  ['cash', 'money', 'dinheiro', 'pagar_na_retirada', 'pay_on_pickup', 'pix_on_delivery'].some(
    m => (order.payment_method ?? '').toLowerCase().includes(m)
  );

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

// ─── PaymentBadge ─────────────────────────────────────────────────────────────

const PAYMENT_CONFIGS: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'Pago',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  pending: { label: 'Ag. pgto',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  failed:  { label: 'Pgto falhou', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  refunded:{ label: 'Reembolsado', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};
const PaymentBadge: React.FC<{ status?: string; method?: string }> = ({ status, method }) => {
  const key = (status || 'pending').toLowerCase();
  const isCash = ['cash', 'dinheiro'].includes((method || '').toLowerCase());
  const cfg = PAYMENT_CONFIGS[key] || PAYMENT_CONFIGS.pending;
  const label = isCash && key === 'pending' ? 'Dinheiro' : cfg.label;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {label}
    </span>
  );
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

interface CardProps {
  order: StoreOrder;
  advancing: boolean;
  paying: boolean;
  cancelling: boolean;
  isUpdating?: boolean;
  isSuccess?: boolean;
  isDragging?: boolean;
  onAdvance: (o: StoreOrder) => void;
  onPay: (o: StoreOrder) => void;
  onCancel: (o: StoreOrder) => void;
  onDetail: (o: StoreOrder) => void;
  onUberClick?: (o: StoreOrder) => void;
  storeSlug?: string;
}

const OrderCard: React.FC<CardProps> = ({
  order, advancing, paying, cancelling, isUpdating, isSuccess, isDragging,
  onAdvance, onPay, onCancel, onDetail, onUberClick, storeSlug,
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
  const canRequestUber =
    storeSlug &&
    order.delivery_method === 'delivery' &&
    ['confirmed', 'preparing'].includes(order.status) &&
    (!order.delivery_provider || order.delivery_provider === 'none');

  const urgencyBorder =
    isSuccess   ? 'border-emerald-400 dark:border-emerald-600' :
    isUpdating  ? 'border-primary-400 dark:border-primary-600' :
    urgency === 'critical' ? 'border-red-400 dark:border-red-700' :
    urgency === 'warning'  ? 'border-yellow-400 dark:border-yellow-600' :
    'border-black/8 dark:border-white/8';

  return (
    <div
      onClick={() => !isUpdating && onDetail(order)}
      className={`
        cursor-pointer rounded-xl border-2 bg-white/95 dark:bg-zinc-900 p-2.5
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-md
        ${isDragging ? 'shadow-2xl ring-2 ring-primary-500 scale-105 rotate-1' : ''}
        ${isUpdating ? 'opacity-70' : ''}
        ${urgency === 'critical' && !isSuccess && !isUpdating ? 'animate-pulse' : ''}
        ${urgencyBorder}
      `}
    >
      {/* Row 1: order number + elapsed + delivery badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-zinc-500">
          #{order.order_number}
        </span>
        <div className="flex items-center gap-1">
          {isUpdating && <ArrowPathIcon className="h-3 w-3 text-primary-500 animate-spin" />}
          {isSuccess && <span className="text-[10px] font-bold text-emerald-600">✓ Movido</span>}
          {!isUpdating && !isSuccess && elapsed > 0 && (
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
            isPickup
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
          }`}>
            {isPickup ? <HomeIcon className="h-2.5 w-2.5" /> : <TruckIcon className="h-2.5 w-2.5" />}
            {isPickup ? 'Retirada' : 'Delivery'}
          </span>
        </div>
      </div>

      {/* Row 2: customer name + value */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="truncate text-[12px] font-semibold leading-tight text-gray-900 dark:text-white">
          {order.customer_name || 'Cliente'}
        </p>
        <p className="shrink-0 text-[14px] font-bold tracking-tight text-gray-900 dark:text-white">
          R$ {fmt(order.total)}
        </p>
      </div>

      {/* Row 3: phone + payment + items */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {order.customer_phone && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-zinc-500">
            <PhoneIcon className="h-2.5 w-2.5" />
            {order.customer_phone}
          </span>
        )}
        <PaymentBadge status={order.payment_status} method={order.payment_method} />
        {order.items?.length > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-zinc-500">
            {order.items.length} item(ns)
          </span>
        )}
      </div>

      {/* Action buttons — stopPropagation so card click (→ detail) doesn't trigger */}
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {canRequestUber && (
          <button
            onClick={() => onUberClick?.(order)}
            disabled={isUpdating}
            title="Solicitar motorista Uber"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="8.5" r="1.5" />
              <circle cx="8.5" cy="12" r="1.5" />
              <circle cx="15.5" cy="12" r="1.5" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </button>
        )}

        {hasPendingPayment && (
          <button
            onClick={() => onPay(order)}
            disabled={paying || isUpdating}
            title="Lançar pagamento"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-900/20 dark:text-emerald-400 transition-colors"
          >
            {paying ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CurrencyDollarIcon className="h-3.5 w-3.5" />}
          </button>
        )}

        {action && (
          <button
            onClick={() => onAdvance(order)}
            disabled={advancing || isUpdating}
            className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors disabled:opacity-60 ${action.color}`}
          >
            {advancing ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
            <span className="truncate">{action.label}</span>
          </button>
        )}

        <button
          onClick={() => onCancel(order)}
          disabled={cancelling || isUpdating}
          title="Cancelar pedido"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-100 text-red-400 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/30 dark:text-red-500 transition-colors"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// Sortable wrapper for DnD
interface SortableCardProps extends CardProps {
  id: string;
}
const SortableCard: React.FC<SortableCardProps> = ({ id, ...props }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <OrderCard {...props} isDragging={isDragging} />
    </div>
  );
};

// Droppable column wrapper
const DroppableColumn: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors ${isOver ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}
    >
      {children}
    </div>
  );
};

// ─── Local optimistic state ───────────────────────────────────────────────────

interface LocalState {
  status: string;
  isPending: boolean;
  isConfirmed: boolean;
  timestamp: number;
}
const LOCAL_TTL = 60000;

// ─── Main Page ────────────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId, storeSlug } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();
  const storeQuery = storeSlug || storeId;
  const orderCreateRoute = storeQuery ? `/stores/${storeQuery}/orders/new` : null;

  // ── Novo Pedido (PDV) drawer ─────────────────────────────────────────────
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  // ── Uber Delivery Modal ──────────────────────────────────────────────────
  const [uberModalOrderId, setUberModalOrderId] = useState<string | undefined>();

  // Keyboard shortcut: press 'N' when not focused on an input opens the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      if (e.key === 'n' || e.key === 'N') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          setIsNewOrderOpen(true);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localStates, setLocalStates] = useState<Map<string, LocalState>>(new Map());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());

  const { playNotificationSound } = useNotificationSound();

  const loadOrders = useCallback(async (bg = false) => {
    if (!storeQuery) { setLoading(false); return; }
    bg ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getOrders({ store: storeQuery, page_size: 500 });
      setOrders(res.results ?? []);
      setLastSync(new Date());
    } catch (err) {
      console.error('[OrdersPage] loadOrders:', err);
      toast.error(getErrorMessage(err) || 'Erro ao carregar pedidos');
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

  // Clean up local state when external data catches up
  useEffect(() => {
    setLocalStates(prev => {
      const next = new Map(prev);
      let changed = false;
      const now = Date.now();
      for (const [id, state] of prev.entries()) {
        if (!state.isConfirmed) continue;
        const ext = orders.find(o => o.id === id);
        if (!ext || ext.status === state.status || now - state.timestamp > LOCAL_TTL) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orders]);

  // Effective orders: local state takes priority (optimistic updates)
  const effectiveOrders = useMemo(() =>
    orders.map(o => {
      const loc = localStates.get(o.id);
      return loc ? { ...o, status: loc.status } : o;
    }),
  [orders, localStates]);

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
    } catch (err) {
      console.error('[OrdersPage] handleAdvance:', err);
      toast.error(getErrorMessage(err) || 'Erro ao atualizar status');
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
    } catch (err) {
      console.error('[OrdersPage] handlePay:', err);
      toast.error(getErrorMessage(err) || 'Erro ao lançar pagamento');
    } finally {
      setPayingId(null);
    }
  }, [patchOrder]);

  const handleCancel = useCallback(async (order: StoreOrder) => {
    const confirmed = await confirm({
      title: 'Cancelar pedido',
      message: `Cancelar pedido #${order.order_number}? Esta ação não pode ser desfeita.`,
      variant: 'warning',
    });
    if (!confirmed) return;
    setCancellingId(order.id);
    try {
      await cancelOrder(order.id);
      patchOrder(order.id, { status: 'cancelled' });
      toast.success(`Pedido #${order.order_number} cancelado`);
    } catch (err) {
      console.error('[OrdersPage] handleCancel:', err);
      toast.error(getErrorMessage(err) || 'Erro ao cancelar pedido');
    } finally {
      setCancellingId(null);
    }
  }, [patchOrder]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Column → order map (newest first)
  const columnData = useMemo(() =>
    COLUMNS.map(col => ({
      ...col,
      orders: effectiveOrders
        .filter(o => !['cancelled'].includes(o.status) && (col.statuses as readonly string[]).includes(o.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    })),
  [effectiveOrders]);

  const findColumn = useCallback((orderId: string): ColumnId | null => {
    for (const col of columnData) {
      if (col.orders.some(o => o.id === orderId)) return col.id;
    }
    return null;
  }, [columnData]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const orderId = active.id as string;
    const overId = over.id as string;
    const srcCol = findColumn(orderId);
    const isColDrop = COLUMNS.some(c => c.id === overId);
    const destCol = isColDrop ? (overId as ColumnId) : findColumn(overId);

    if (!srcCol || !destCol || srcCol === destCol) return;

    // Map column id to a canonical status to send to API
    const colToStatus: Record<ColumnId, string> = {
      pending:   'pending',
      confirmed: 'confirmed',
      preparing: 'preparing',
      dispatch:  'out_for_delivery',
      done:      'delivered',
    };
    const newStatus = colToStatus[destCol];
    const order = effectiveOrders.find(o => o.id === orderId);
    if (!order) return;

    // Optimistic update
    setLocalStates(prev => {
      const next = new Map(prev);
      next.set(orderId, { status: newStatus, isPending: true, isConfirmed: false, timestamp: Date.now() });
      return next;
    });

    try {
      await updateOrderStatus(orderId, newStatus);
      setLocalStates(prev => {
        const next = new Map(prev);
        const cur = next.get(orderId);
        if (cur) next.set(orderId, { ...cur, isPending: false, isConfirmed: true, timestamp: Date.now() });
        return next;
      });
      setSuccessIds(prev => new Set(prev).add(orderId));
      setTimeout(() => setSuccessIds(prev => { const n = new Set(prev); n.delete(orderId); return n; }), 2000);
      toast.success(`#${order.order_number} movido`);
    } catch (err) {
      console.error('[OrdersPage] handleDragEnd:', err);
      setLocalStates(prev => { const n = new Map(prev); n.delete(orderId); return n; });
      toast.error(getErrorMessage(err) || 'Erro ao mover pedido');
    }
  };

  const activeOrder = useMemo(() => effectiveOrders.find(o => o.id === activeId) || null, [effectiveOrders, activeId]);

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
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen flex-col gap-3 bg-[#f5f1e8] px-2 py-2 text-fg-primary dark:bg-[#050505] sm:px-3 sm:py-3">

        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/5 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-900 dark:text-white">Pedidos</h1>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              rtConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500'
            }`}>
              {rtConnected ? <SignalIcon className="h-3 w-3" /> : <SignalSlashIcon className="h-3 w-3" />}
              {rtConnected ? 'Ao vivo' : 'Offline'}
            </span>
            {lastSync && (
              <span className="text-xs text-gray-400 dark:text-zinc-600 hidden sm:block">
                {format(lastSync, 'HH:mm:ss', { locale: ptBR })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* PDV Drawer button */}
            {storeQuery && (
              <button
                onClick={() => setIsNewOrderOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                title="Atalho: tecla N"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                Novo Pedido (N)
              </button>
            )}
            {orderCreateRoute && (
              <button
                onClick={() => navigate(orderCreateRoute)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                Formulário
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

        {/* Kanban columns */}
        <div className="grid min-h-0 flex-1 gap-2 md:grid-cols-5 max-xl:grid-cols-2">
          {columnData.map(col => {
            const Icon = col.Icon;
            return (
              <div
                key={col.id}
                className={`flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 dark:border-zinc-800 xl:min-h-[calc(100vh-5.75rem)] ${col.colBg}`}
              >
                {/* Column header */}
                <div className={`${col.headerBg} text-white px-3 py-2.5 border-t-0 rounded-t-2xl`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 opacity-90" />
                      <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold min-w-[22px] text-center">
                      {col.orders.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/70 mt-0.5">{col.description}</p>
                </div>

                {/* Droppable area */}
                <SortableContext items={col.orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumn id={col.id}>
                    {col.orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-200/60 dark:border-zinc-700/60 rounded-xl">
                        <ShoppingCartIcon className="h-6 w-6 text-gray-200 dark:text-zinc-700 mb-1.5" />
                        <p className="text-xs text-gray-300 dark:text-zinc-700">Arraste aqui</p>
                      </div>
                    ) : (
                      col.orders.map(order => (
                        <SortableCard
                          key={order.id}
                          id={order.id}
                          order={order}
                          advancing={advancingId === order.id}
                          paying={payingId === order.id}
                          cancelling={cancellingId === order.id}
                          isUpdating={localStates.get(order.id)?.isPending}
                          isSuccess={successIds.has(order.id)}
                          onAdvance={handleAdvance}
                          onPay={handlePay}
                          onCancel={handleCancel}
                          onDetail={o => navigate(`/stores/${storeQuery}/orders/${o.id}`)}
                          onUberClick={o => setUberModalOrderId(o.id)}
                          storeSlug={storeSlug || undefined}
                        />
                      ))
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeOrder ? (
          <div className="rotate-2 scale-105 shadow-2xl opacity-90">
            <OrderCard
              order={activeOrder}
              advancing={false} paying={false} cancelling={false} isDragging
              onAdvance={() => {}} onPay={() => {}} onCancel={() => {}} onDetail={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
      {ConfirmDialog}

      {/* PDV: Novo Pedido Drawer */}
      {storeQuery && (
        <NewOrderDrawer
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          storeSlug={storeQuery}
          storeId={storeId || undefined}
          onOrderCreated={() => {
            setIsNewOrderOpen(false);
            loadOrders(true);
          }}
        />
      )}

      {/* Uber Delivery Modal */}
      {uberModalOrderId && storeQuery && (
        <OrderDeliveryModal
          orderId={uberModalOrderId}
          storeSlug={storeQuery}
          isOpen={Boolean(uberModalOrderId)}
          onClose={() => setUberModalOrderId(undefined)}
          onAccept={() => {
            setUberModalOrderId(undefined);
            loadOrders(true);
          }}
        />
      )}
    </DndContext>
  );
};

export default OrdersPage;
