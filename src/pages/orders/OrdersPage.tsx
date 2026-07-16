import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/common';
import { Button, Card } from '../../components/ui';
import {
  getOrders,
  updateOrderStatus,
  markOrderPaid,
  cancelOrder,
  StoreOrder,
} from '../../services/storesApi';
import { useNotificationSound, useStore, useConfirm, useOrderDetailModal } from '../../hooks';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { useRootStore } from '../../stores/rootStore';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import type { Order } from '../../types';

// ─── Column config ────────────────────────────────────────────────────────────
// Extraído para orderColumns.ts (fonte única — usado também pelo drill-down dos KPIs)

import { COLUMNS, resolveFocusColumn } from './orderColumns';
import type { ColumnId } from './orderColumns';
import { getStageStart, getAvgPrepMinutes } from './orderSla';

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

// Rótulo curto de agendamento p/ o card ("15/01 14:30"). Vazio se não houver agendamento.
const formatScheduledShort = (order: { scheduled_date?: string | null; scheduled_time?: string | null }): string => {
  const date = order.scheduled_date;
  const time = order.scheduled_time ? order.scheduled_time.slice(0, 5) : '';
  let datePart = '';
  if (date) {
    const [, m, d] = date.split('-');
    datePart = m && d ? `${d}/${m}` : date;
  }
  return [datePart, time].filter(Boolean).join(' ');
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

const OrderCardBase: React.FC<CardProps> = ({
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
  // Elapsed por etapa (SLA): em preparo conta desde preparing_at, não da criação
  const elapsed = getElapsedMinutes(getStageStart(order));
  const urgency = getElapsedUrgency(elapsed, order.status);
  const isPickup = order.delivery_method === 'pickup' || order.delivery_method === 'digital';
  const canRequestUber =
    storeSlug &&
    order.delivery_method === 'delivery' &&
    ['confirmed', 'preparing'].includes(order.status) &&
    (!order.delivery_provider || order.delivery_provider === 'none');

  const urgencyBorder =
    isSuccess   ? 'border-emerald-400 dark:border-emerald-600' :
    isUpdating  ? 'border-brand' :
    urgency === 'critical' ? 'border-red-400 dark:border-red-700' :
    urgency === 'warning'  ? 'border-yellow-400 dark:border-yellow-600' :
    'border-border-token';

  return (
    <div
      onClick={() => !isUpdating && onDetail(order)}
      className={`
        cursor-pointer rounded border-2 bg-surface text-fg-token p-2.5
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-md
        ${isDragging ? 'shadow-2xl ring-2 ring-brand scale-105 rotate-1' : ''}
        ${isUpdating ? 'opacity-70' : ''}
        ${urgency === 'critical' && !isSuccess && !isUpdating ? 'animate-pulse' : ''}
        ${urgencyBorder}
      `}
    >
      {/* Row 1: order number + elapsed + delivery badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="font-mono text-[10px] font-bold text-fg-muted-token">
          #{order.order_number}
        </span>
        <div className="flex items-center gap-1">
          {isUpdating && <ArrowPathIcon className="h-3 w-3 text-brand animate-spin" />}
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

      {/* Agendamento — destaque quando o cliente agendou data/hora */}
      {formatScheduledShort(order) && (
        <div className="mb-1.5 flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand w-fit">
          <CalendarDaysIcon className="h-2.5 w-2.5" />
          Agendado {formatScheduledShort(order)}
        </div>
      )}

      {/* Row 2: customer name + value */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="truncate text-[12px] font-semibold leading-tight text-fg-token">
          {order.customer_name || 'Cliente'}
        </p>
        <p className="shrink-0 text-[14px] font-bold tracking-tight text-fg-token">
          R$ {fmt(order.total)}
        </p>
      </div>

      {/* Row 3: phone + payment + items */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {order.customer_phone && (
          <span className="flex items-center gap-0.5 text-[10px] text-fg-muted-token">
            <PhoneIcon className="h-2.5 w-2.5" />
            {order.customer_phone}
          </span>
        )}
        <PaymentBadge status={order.payment_status} method={order.payment_method} />
        {order.items?.length > 0 && (
          <span className="text-[10px] text-fg-muted-token">
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-900/20 dark:text-emerald-400 transition-colors"
          >
            {paying ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CurrencyDollarIcon className="h-3.5 w-3.5" />}
          </button>
        )}

        {action && (
          <button
            onClick={() => onAdvance(order)}
            disabled={advancing || isUpdating}
            className={`flex h-7 flex-1 items-center justify-center gap-1 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors disabled:opacity-60 ${action.color}`}
          >
            {advancing ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
            <span className="truncate">{action.label}</span>
          </button>
        )}

        <button
          onClick={() => onCancel(order)}
          disabled={cancelling || isUpdating}
          title="Cancelar pedido"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-red-100 text-red-400 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/30 dark:text-red-500 transition-colors"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// Memoizado: o tick de 60s vive DENTRO de cada card (atualiza só o próprio label
// de tempo). Com React.memo, um re-render do board (ex.: WebSocket de outro
// pedido, mudança de selectedIds) não re-renderiza cards cujas props não mudaram.
// Pré-requisito: os handlers passados precisam ter referência estável (useCallback).
const OrderCard = memo(OrderCardBase);

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
      className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors ${isOver ? 'bg-brand-soft' : ''}`}
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
// Referência estável para evitar re-render infinito quando a loja não tem pedidos
const EMPTY_ORDERS: StoreOrder[] = [];

// ─── Main Page ────────────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId, storeSlug } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();
  const storeQuery = storeSlug || storeId;

  // ── Novo Pedido (PDV) drawer ─────────────────────────────────────────────
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  // Deep-link ?novo=1 abre o wizard direto (ex.: botão "Novo pedido" do
  // dashboard). Substituiu a antiga página /orders/new (builder duplicado).
  const [pageParams, setPageParams] = useSearchParams();
  useEffect(() => {
    if (pageParams.get('novo')) {
      setIsNewOrderOpen(true);
      pageParams.delete('novo');
      setPageParams(pageParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Uber Delivery Modal ──────────────────────────────────────────────────
  const [uberModalOrderId, setUberModalOrderId] = useState<string | undefined>();

  // ── Loading state (local) ────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Real-time orders from Zustand store + WebSocket
  // Selector estreito: re-render apenas quando os pedidos DESTA loja mudam,
  // não em qualquer mudança da store global.
  const storeOrders = useRootStore(
    (s) => (storeQuery ? s.orders[storeQuery] : undefined)
  ) ?? EMPTY_ORDERS;
  const { playNotificationSound: _playNotificationSound } = useNotificationSound();

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localStates, setLocalStates] = useState<Map<string, LocalState>>(new Map());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // WebSocket real-time sync
  const { isConnected: wsConnected } = useRealTimeOrders({
    enabled: Boolean(storeQuery),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
  });

  // Clean up local state when external data catches up
  useEffect(() => {
    setLocalStates((prev: Map<string, LocalState>) => {
      const next = new Map(prev);
      let changed = false;
      const now = Date.now();
      for (const [id, state] of prev.entries()) {
        if (!state.isConfirmed) continue;
        const ext = storeOrders.find((o: StoreOrder) => o.id === id);
        if (!ext || ext.status === state.status || now - state.timestamp > LOCAL_TTL) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [storeOrders]);

  // Effective orders: local state takes priority (optimistic updates)
  const effectiveOrders = useMemo(() =>
    storeOrders.map((o: StoreOrder) => {
      const loc = localStates.get(o.id);
      return loc ? { ...o, status: loc.status } : o;
    }),
  [storeOrders, localStates]);

  const patchOrder = useCallback((id: string, patch: Partial<StoreOrder>) => {
    if (!storeQuery) return;
    // Ler do getState() (não do closure) para não sobrescrever updates que
    // chegaram via WebSocket entre o render e o clique (stale closure).
    const { orders, setOrders } = useRootStore.getState();
    const current = orders[storeQuery] || [];
    setOrders(storeQuery, current.map((o: StoreOrder) => o.id === id ? { ...o, ...patch } : o));
  }, [storeQuery]);

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
    } catch {
      toast.error('Erro ao cancelar pedido');
    } finally {
      setCancellingId(null);
    }
  }, [patchOrder]);

  // Detalhe do pedido abre em MODAL (sem sair do board). O estado vive na URL
  // (?pedido=<id>) → deep-link + botão voltar do navegador fecham naturalmente.
  const { openOrder, orderId: openOrderId } = useOrderDetailModal();

  // Handlers estáveis para os cards: sem isto, o object/closure recriado a cada
  // render quebra o React.memo do OrderCard e re-renderiza o board inteiro.
  const handleDetail = useCallback((o: StoreOrder) => {
    openOrder(o.id);
  }, [openOrder]);

  // Ação dentro do modal (avançar status / PIX / edição) reflete no card do board
  // sem reload: aplica o patch otimista no rootStore.
  const handleModalOrderChanged = useCallback((o: Order) => {
    patchOrder(o.id, { status: o.status, payment_status: o.payment_status });
  }, [patchOrder]);

  const handleUberClick = useCallback((o: StoreOrder) => {
    setUberModalOrderId(o.id);
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // SLA: tempo médio confirmado→pronto dos pedidos carregados
  const avgPrepMinutes = useMemo(() => getAvgPrepMinutes(effectiveOrders), [effectiveOrders]);

  // Drill-down dos KPIs do dashboard: ?status=pending foca a coluna correspondente
  const [searchParams, setSearchParams] = useSearchParams();
  const focusColumn = resolveFocusColumn(searchParams.get('status'));
  const clearFocus = useCallback(() => {
    searchParams.delete('status');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Column → order map (newest first)
  const columnData = useMemo(() =>
    COLUMNS.filter(col => !focusColumn || col.id === focusColumn).map(col => ({
      ...col,
      orders: effectiveOrders
        .filter((o: StoreOrder) => !['cancelled'].includes(o.status) && (col.statuses as readonly string[]).includes(o.status))
        .sort((a: StoreOrder, b: StoreOrder) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    })),
  [effectiveOrders, focusColumn]);

  // Fila do modal: os pedidos da MESMA coluna do pedido aberto, na ordem do
  // board — habilita a navegação anterior/próximo dentro do OrderDetailModal.
  const modalSiblings = useMemo(() => {
    if (!openOrderId) return undefined;
    const col = columnData.find(c => c.orders.some((o: StoreOrder) => o.id === openOrderId));
    return col ? col.orders.map((o: StoreOrder) => o.id) : undefined;
  }, [openOrderId, columnData]);

  const findColumn = useCallback((orderId: string): ColumnId | null => {
    for (const col of columnData) {
      if (col.orders.some((o) => o.id === orderId)) return col.id;
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
    const order = effectiveOrders.find((o: StoreOrder) => o.id === orderId);
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
    } catch {
      setLocalStates(prev => { const n = new Map(prev); n.delete(orderId); return n; });
      toast.error('Erro ao mover pedido');
    }
  };

  const activeOrder = useMemo(() => effectiveOrders.find((o: StoreOrder) => o.id === activeId) || null, [effectiveOrders, activeId]);

  // Load orders from API
  const loadOrders = useCallback(async (force: boolean = false) => {
    if (!storeQuery) return;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      const response = await getOrders({ store: storeQuery });
      const { setOrders } = useRootStore.getState();
      setOrders(storeQuery, response.results);
      setLastSync(new Date());
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [storeQuery]);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [storeQuery, loadOrders]);

  if (loading) return <PageLoading />;

  if (!storeQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-fg-muted-token">Selecione uma loja para ver os pedidos.</p>
        <Button onClick={() => navigate('/stores')}>Selecionar loja</Button>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen flex-col gap-3 bg-canvas px-2 py-2 text-fg-token sm:px-3 sm:py-3">

        {/* Header */}
        <Card className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold uppercase tracking-[0.24em] text-fg-token">Pedidos</h1>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              wsConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-surface-2 text-fg-muted-token'
            }`}>
              {wsConnected ? <SignalIcon className="h-3 w-3" /> : <SignalSlashIcon className="h-3 w-3" />}
              {wsConnected ? 'Ao vivo' : 'Offline'}
            </span>
            {lastSync && (
              <span className="text-xs text-fg-muted-token hidden sm:block">
                {format(lastSync, 'HH:mm:ss', { locale: ptBR })}
              </span>
            )}
            {avgPrepMinutes !== null && (
              <span
                className="hidden md:inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                title="Tempo médio entre confirmação e pronto (pedidos carregados)"
              >
                Preparo médio: {avgPrepMinutes}min
              </span>
            )}
            {focusColumn && (
              <button
                type="button"
                onClick={clearFocus}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                title="Limpar filtro"
              >
                Filtrando: {COLUMNS.find((c) => c.id === focusColumn)?.label}
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {storeQuery && (
              <a
                href={`/stores/${storeQuery}/kds`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir tela de cozinha em nova aba"
              >
                <Button variant="outline" className="py-1.5">
                  Modo Cozinha (KDS)
                </Button>
              </a>
            )}
            {/* PDV Drawer button */}
            {storeQuery && (
              <Button
                onClick={() => setIsNewOrderOpen(true)}
                className="py-1.5"
                leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                title="Atalho: tecla N"
              >
                Novo Pedido (N)
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => loadOrders(true)}
              className="py-1.5"
              leftIcon={<ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Atualizar
            </Button>
          </div>
        </Card>

        {/* Kanban columns — <xl: scroll horizontal (kanban-standard); xl+: 5 colunas na grade.
            Altura das colunas vem do flex-1 do container (não há Navbar nesta rota dedicada). */}
        <div className="min-h-0 flex-1 gap-2 max-xl:flex max-xl:snap-x max-xl:overflow-x-auto max-xl:pb-1 xl:grid xl:grid-cols-5">
          {columnData.map((col) => {
            const Icon = col.Icon;
            return (
              <div
                key={col.id}
                className={`flex min-h-[220px] flex-col overflow-hidden rounded border border-border-token max-xl:w-[300px] max-xl:min-w-[280px] max-xl:shrink-0 max-xl:snap-start ${col.colBg}`}
              >
                {/* Column header */}
                <div className={`${col.headerBg} text-white px-3 py-2.5 border-t-0 rounded-t`}>
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
                      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border-token rounded">
                        <ShoppingCartIcon className="h-6 w-6 text-fg-muted-token opacity-50 mb-1.5" />
                        <p className="text-xs text-fg-muted-token">Arraste aqui</p>
                      </div>
                    ) : (
                      col.orders.map((order: StoreOrder) => (
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
                          onDetail={handleDetail}
                          onUberClick={handleUberClick}
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
      {storeSlug && (
        <NewOrderDrawer
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          storeSlug={storeSlug}
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

      {/* Detalhe do pedido em modal (aberto via ?pedido=<id>) */}
      <OrderDetailModal onOrderChanged={handleModalOrderChanged} siblings={modalSiblings} />
    </DndContext>
  );
};

export default OrdersPage;
