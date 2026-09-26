import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import CreditosDeCarteiraHoje from './CreditosDeCarteiraHoje';
import {
  Button,
  PageShell,
  SeloDeEstado,
  estadoDePagamento,
  estadoDePedido,
  tomDoPrazo,
} from '../../components/ui';
import {
  getOrders,
  updateOrderStatus,
  markOrderPaid,
  cancelOrder,
  StoreOrder,
} from '../../services/storesApi';
import { useStore, useOrderDetailModal } from '../../hooks';
import { CancelarPedidoModal } from '../../components/orders/CancelarPedidoModal';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { getErrorMessage } from '../../services';
import { useRootStore, resolveStoreKey } from '../../stores/rootStore';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import type { Order } from '../../types';

// ─── Column config ────────────────────────────────────────────────────────────
// Extraído para orderColumns.ts (fonte única — usado também pelo drill-down dos KPIs)

import { COLUMNS, resolveFocusColumn } from './orderColumns';
import { pedidosDaColuna, ENTREGUES_DE_HOJE } from './pedidosDoQuadro';
import type { ColumnId } from './orderColumns';
import { getStageStart, getAvgPrepMinutes, situacaoDoPreparo } from './orderSla';
import { proximaAcaoDoPedido } from './proximaAcao';
import { saldoDoPedido } from './saldoDoPedido';
import { formatCurrency } from '../../utils/formatters';

// Next status for advance button
/**
 * Adaptador para a função única de `proximaAcao.ts`.
 *
 * A regra morava aqui e uma SEGUNDA cópia morava no detalhe do pedido — e foi
 * a cópia de lá que mandou "pronto para retirada" numa entrega. Uma fonte só.
 */
const getNextAction = (order: StoreOrder): { status: string; label: string } | null => {
  const acao = proximaAcaoDoPedido(order as unknown as Order);
  // A cor do botão sai do kit (Button primário), não da máquina de estados:
  // cor no painel é só para estado, e o botão é ação.
  return acao ? { status: acao.status, label: acao.rotulo } : null;
};

const needsPayment = (order: StoreOrder) =>
  order.payment_status !== 'paid' &&
  ['cash', 'money', 'dinheiro', 'pagar_na_retirada', 'pay_on_pickup', 'pix_on_delivery'].some(
    m => (order.payment_method ?? '').toLowerCase().includes(m)
  );

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return [datePart, time].filter(Boolean).join('');
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

// Botão de ícone do cartão (Uber, lançar pagamento, cancelar): neutro. A cor
// do cartão é do estado do pedido, não das ações.
const BOTAO_ICONE =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border-token ' +
  'bg-surface text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token ' +
  'disabled:opacity-60';

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
  // Com previsão de preparo, o atraso é contra a PREVISÃO da loja, não contra
  // os 20/40min fixos. Sem previsão, fica a régua antiga do tempo decorrido.
  const preparo = situacaoDoPreparo(order);
  const urgency: ElapsedUrgency = preparo
    ? (preparo.atrasadoMin > 0 ? 'critical' : preparo.faltamMin <= 5 ? 'warning' : 'ok')
    : getElapsedUrgency(elapsed, order.status);
  const isPickup = order.delivery_method === 'pickup' || order.delivery_method === 'digital';
  const canRequestUber =
    storeSlug &&
    order.delivery_method === 'delivery' &&
    ['confirmed', 'preparing'].includes(order.status) &&
    (!order.delivery_provider || order.delivery_provider === 'none');

  // A borda é o único lugar em que o prazo pinta o cartão inteiro: atrasado
  // precisa ser visto de longe, no quadro cheio.
  const urgencyBorder =
    isSuccess   ? 'border-success-token' :
    isUpdating  ? 'border-brand' :
    urgency === 'critical' ? 'border-danger-token' :
    urgency === 'warning'  ? 'border-warning-token' :
    'border-border-token';
  const pagamento = estadoDePagamento(order.payment_status, order.payment_method);
  const saldo = saldoDoPedido(order);

  return (
    <div
      onClick={() => !isUpdating && onDetail(order)}
      className={`
        superficie-alta cursor-pointer border-2 text-fg-token p-2.5
        ${isDragging ? 'shadow-flutuante ring-2 ring-brand' : ''}
        ${isUpdating ? 'opacity-70' : ''}
        ${urgency === 'critical' && !isSuccess && !isUpdating ? 'animate-pulse' : ''}
        ${urgencyBorder}
      `}
    >
      {/* Row 1: order number + elapsed + delivery badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="font-mono text-badge font-bold text-fg-muted-token">
          #{order.order_number}
        </span>
        <div className="flex items-center gap-1">
          {isUpdating && <ArrowPathIcon className="h-3 w-3 text-brand-ink animate-spin" />}
          {isSuccess && <SeloDeEstado tone="success" className="px-1.5 text-badge">Movido</SeloDeEstado>}
          {!isUpdating && !isSuccess && elapsed > 0 && (
            <SeloDeEstado tone={tomDoPrazo(urgency)} className="gap-0.5 px-1.5 text-badge">
              <ClockIcon className="h-2.5 w-2.5" aria-hidden />
              {formatElapsed(elapsed)}
            </SeloDeEstado>
          )}
          {/* Entrega × retirada é tipo, não estado: sem cor. */}
          <SeloDeEstado tone="neutral" className="gap-0.5 px-1.5 text-badge">
            {isPickup ? <HomeIcon className="h-2.5 w-2.5" aria-hidden /> : <TruckIcon className="h-2.5 w-2.5" aria-hidden />}
            {isPickup ? 'Retirada' : 'Delivery'}
          </SeloDeEstado>
        </div>
      </div>

      {/* Previsão de preparo: atrasado grita, no prazo só informa a hora */}
      {preparo && !isUpdating && !isSuccess && (
        <div data-testid="previsao-preparo" className="mb-1.5 w-fit">
          <SeloDeEstado
            tone={preparo.atrasadoMin > 0 ? 'danger' : 'neutral'}
            className="gap-1 px-1.5 text-badge"
          >
            <ClockIcon className="h-2.5 w-2.5" aria-hidden />
            {preparo.atrasadoMin > 0
              ? `Atrasado ${formatElapsed(preparo.atrasadoMin)}`
              : `Pronto às ${format(new Date(preparo.previstoPara), 'HH:mm', { locale: ptBR })}`}
          </SeloDeEstado>
        </div>
      )}

      {/* Agendamento — destaque quando o cliente agendou data/hora */}
      {formatScheduledShort(order) && (
        <div className="mb-1.5 w-fit">
          <SeloDeEstado tone="info" className="gap-1 px-1.5 text-badge">
            <CalendarDaysIcon className="h-2.5 w-2.5" aria-hidden />
            Agendado {formatScheduledShort(order)}
          </SeloDeEstado>
        </div>
      )}

      {/* Row 2: customer name + value */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="truncate text-caption font-semibold leading-tight text-fg-token">
          {order.customer_name || 'Cliente'}
        </p>
        <p className="shrink-0 text-body font-bold tracking-tight text-fg-token">
          {formatCurrency(order.total)}
        </p>
      </div>

      {/* Row 3: phone + payment + items */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {order.customer_phone && (
          <span className="flex items-center gap-0.5 text-badge text-fg-muted-token">
            <PhoneIcon className="h-2.5 w-2.5" />
            {order.customer_phone}
          </span>
        )}
        <SeloDeEstado tone={pagamento.tone} className="px-1.5 text-badge">
          {pagamento.rotulo}
        </SeloDeEstado>
        {/* Pago a menor: a trava deixa o pedido parado — o card precisa dizer por quê. */}
        {saldo.aMenor && (
          <span title={saldo.texto}>
            <SeloDeEstado tone="danger" className="px-1.5 text-badge">
              Falta {formatCurrency(saldo.falta)}
            </SeloDeEstado>
          </span>
        )}
        {order.items?.length > 0 && (
          <span className="text-badge text-fg-muted-token">
            {/* "1 item(ns)" denuncia a máquina no quadro que o dono olha o dia
                inteiro. Mesma regra que já valia no detalhe do pedido. */}
            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
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
            aria-label="Solicitar motorista Uber"
            className={BOTAO_ICONE}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
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
            aria-label="Lançar pagamento"
            className={BOTAO_ICONE}
          >
            {paying ? <ArrowPathIcon className="h-3 w-3 animate-spin" aria-hidden /> : <CurrencyDollarIcon className="h-3.5 w-3.5" aria-hidden />}
          </button>
        )}

        {action && (
          <Button
            size="xs"
            onClick={() => onAdvance(order)}
            disabled={advancing || isUpdating}
            className="min-w-0 flex-1 gap-1 px-1.5 text-badge"
          >
            {advancing ? <ArrowPathIcon className="h-3 w-3 shrink-0 animate-spin" aria-hidden /> : <CheckIcon className="h-3 w-3 shrink-0" aria-hidden />}
            <span className="truncate">{action.label}</span>
          </Button>
        )}

        <button
          onClick={() => onCancel(order)}
          disabled={cancelling || isUpdating}
          title="Cancelar pedido"
          aria-label="Cancelar pedido"
          className={`${BOTAO_ICONE} hover:border-danger-token hover:bg-danger-soft hover:text-danger-token`}
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
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
  // Lê pela MESMA chave normalizada que o WebSocket usa para escrever.
  const storeOrders = useRootStore(
    (s) => (storeQuery ? s.orders[resolveStoreKey(s.stores, storeQuery)] : undefined)
  ) ?? EMPTY_ORDERS;
  // O alerta sonoro agora é disparado em useRealTimeOrders, na chegada do
  // evento `order.created` — assim toca mesmo com o operador em outra tela.
  // Montar o hook aqui só custava dois listeners de document e um AudioContext
  // (o Chrome limita a 6 por página) sem nunca tocar nada.

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localStates, setLocalStates] = useState<Map<string, LocalState>>(new Map());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // WebSocket real-time sync
  const { isConnected: wsConnected, connectionError: wsConnectionError } = useRealTimeOrders({
    enabled: Boolean(storeQuery),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
  });

  // Aviso único quando o tempo real não conecta — o board continua funcionando
  // via refresh manual/polling, mas o operador precisa saber que não é ao vivo.
  useEffect(() => {
    if (wsConnectionError) {
      toast.error('Conexão em tempo real indisponível — atualizações automáticas de pedidos desativadas');
    }
  }, [wsConnectionError]);

  // Clean up local state when external data catches up
  useEffect(() => {
    setLocalStates((prev: Map<string, LocalState>) => {
      const next = new Map(prev);
      let changed = false;
      const now = Date.now();
      for (const [id, state] of prev.entries()) {
        if (!state.isConfirmed) {
          // Requisição que nunca respondeu (aba suspensa, rede caiu no meio):
          // aqui o TTL ainda faz sentido, senão o card fica "atualizando" para
          // sempre. Só vale para pendente — para confirmado, expirar era o bug.
          if (now - state.timestamp > LOCAL_TTL) {
            next.delete(id);
            changed = true;
          }
          continue;
        }
        const ext = storeOrders.find((o: StoreOrder) => o.id === id);
        // RECONCILIAÇÃO, não expiração cega. Antes o TTL descartava o overlay
        // mesmo com a lista externa ainda no status antigo — e o card voltava
        // sozinho para a coluna anterior. Só descarta quando o servidor já
        // alcançou o estado otimista (ou o pedido sumiu da lista).
        if (!ext || ext.status === state.status) {
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
    const current = orders[resolveStoreKey(useRootStore.getState().stores, storeQuery)] || [];
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

  // Cancelar pede o motivo (CancelarPedidoModal): 0 dos 37 cancelados em
  // 30 dias tinham motivo quando isto era um "tem certeza?".
  const [pedidoACancelar, setPedidoACancelar] = useState<StoreOrder | null>(null);
  const handleCancel = useCallback((order: StoreOrder) => {
    setPedidoACancelar(order);
  }, []);

  const confirmarCancelamento = useCallback(async (order: StoreOrder, motivo: string) => {
    setCancellingId(order.id);
    try {
      await cancelOrder(order.id, motivo);
      setPedidoACancelar(null);
      patchOrder(order.id, { status: 'cancelled' });
      toast.success(`Pedido #${order.order_number} cancelado`);
    } catch (err) {
      console.error('[OrdersPage] confirmarCancelamento:', err);
      toast.error(getErrorMessage(err) || 'Erro ao cancelar pedido');
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
      // "Entregue" mostra só o de hoje; o resto vive no Histórico. As colunas
      // de trabalho em aberto continuam mostrando tudo — pedido parado de
      // ontem é justamente o que precisa aparecer.
      orders: pedidosDaColuna(effectiveOrders as StoreOrder[], col),
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
      // Torna a mudança DURÁVEL, igual aos botões (handleAdvance/handlePay/
      // handleCancel já faziam patchOrder). O arrasto gravava só em
      // `localStates`, um overlay com TTL de 60s: passado o minuto a entrada era
      // descartada sem nunca ter reconciliado, e o card pulava de volta para a
      // coluna antiga na frente do operador — que arrastava de novo (2º PATCH)
      // ou concluía que o pedido não saiu.
      patchOrder(orderId, { status: newStatus });
      // Com o store atualizado o overlay não é mais necessário.
      setLocalStates(prev => {
        const next = new Map(prev);
        next.delete(orderId);
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
      console.error('[OrdersPage] loadOrders:', error);
      toast.error(getErrorMessage(error) || 'Erro ao carregar pedidos');
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
      <div className="flex min-h-screen flex-col bg-canvas px-2 py-2 text-fg-token sm:px-3 sm:py-3">
        <PageShell
          variante="quadro"
          titulo="Pedidos"
          trilha={[
            ...(storeQuery ? [{ rotulo: 'Loja', href: `/stores/${storeQuery}` }] : []),
            { rotulo: 'Pedidos' },
          ]}
          acoes={
            <>
              {/* O kanban só mostra a operação de agora. Quem chega aqui
                  procurando um pedido de semana passada precisava saber que a
                  outra tela existe. */}
              {storeQuery && (
                <Button
                  variant="outline"
                  className="py-1.5"
                  onClick={() => navigate(`/stores/${storeQuery}/orders/historico`)}
                  leftIcon={<ClockIcon className="h-4 w-4" />}
                >
                  Histórico
                </Button>
              )}
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
              {storeQuery && (
                <Button
                  onClick={() => setIsNewOrderOpen(true)}
                  className="py-1.5"
                  leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                  title="Atalho: tecla N"
                >
                  Novo pedido (N)
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
            </>
          }
          filtros={
            // O ESTADO DO QUADRO, na faixa que o chassi reserva para o que é
            // sobre os dados: a conexão ao vivo, o último sinal, o preparo
            // médio e o filtro de coluna ativo.
            <div className="flex flex-wrap items-center gap-2">
              <SeloDeEstado tone={wsConnected ? 'success' : 'neutral'}>
                {wsConnected ? <SignalIcon className="h-3 w-3" aria-hidden /> : <SignalSlashIcon className="h-3 w-3" aria-hidden />}
                {wsConnected ? 'Ao vivo' : 'Offline'}
              </SeloDeEstado>
              {lastSync && (
                <span className="text-xs text-fg-muted-token hidden sm:block">
                  {format(lastSync, 'HH:mm:ss', { locale: ptBR })}
                </span>
              )}
              {avgPrepMinutes !== null && (
                <span
                  className="max-md:hidden"
                  title="Tempo médio entre confirmação e pronto (pedidos carregados)"
                >
                  <SeloDeEstado tone="neutral">Preparo médio: {avgPrepMinutes}min</SeloDeEstado>
                </span>
              )}
              {focusColumn && (
                <button
                  type="button"
                  onClick={clearFocus}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-border-token bg-surface px-2.5 py-0.5 text-xs font-semibold text-fg-token transition-colors hover:bg-surface-2"
                  title="Limpar filtro"
                  aria-label={`Limpar filtro: ${COLUMNS.find((c) => c.id === focusColumn)?.label}`}
                >
                  Filtrando: {COLUMNS.find((c) => c.id === focusColumn)?.label}
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          }
        >

        {/* Compra de saldo (carteira) não entra nas colunas; a faixa diz o que
            foi, para ninguém procurar um pedido que não existe. */}
        <CreditosDeCarteiraHoje storeSlug={storeQuery} />

        {/* Kanban columns — <xl: scroll horizontal (kanban-standard); xl+: 5 colunas na grade.
            Altura das colunas vem do flex-1 do container (não há Navbar nesta rota dedicada). */}
        <div className="min-h-0 flex-1 gap-2 max-xl:flex max-xl:snap-x max-xl:overflow-x-auto max-xl:pb-1 xl:grid xl:grid-cols-5">
          {columnData.map((col) => {
            // O tom da etapa vem do mapa único de status do pedido — o mesmo
            // que pinta o status em qualquer outra tela do painel.
            const { tone } = estadoDePedido(col.statuses[0]);
            return (
              <section
                key={col.id}
                aria-label={`${col.label}: ${col.orders.length} ${col.orders.length === 1 ? 'pedido' : 'pedidos'}`}
                className="superficie flex min-h-[220px] flex-col overflow-hidden max-xl:w-[300px] max-xl:min-w-[280px] max-xl:shrink-0 max-xl:snap-start"
              >
                {/* Cabeçalho da coluna: a cor fica no selo da etapa, o resto é neutro. */}
                <header className="border-b border-border-token px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <SeloDeEstado tone={tone} ponto>
                      {col.label}
                    </SeloDeEstado>
                    <span className="min-w-[22px] text-center text-sm font-semibold tabular-nums text-fg-token">
                      {col.orders.length}
                    </span>
                  </div>
                  <p className="mt-1 text-badge text-fg-muted-token">{col.description}</p>
                </header>

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

                    {/* O quadro passou a mostrar só os entregues de HOJE. Sem
                        dizer para onde foi o resto, some pedido aos olhos do
                        dono — que é pior do que a pilha que havia antes. */}
                    {col.id === ENTREGUES_DE_HOJE && (
                      <Link
                        to={`/stores/${storeSlug}/orders/historico`}
                        className="mt-2 flex items-center justify-center gap-1.5 rounded border border-dashed border-border-token py-2.5 text-xs text-fg-muted-token hover:border-brand hover:text-brand"
                      >
                        <ClockIcon className="h-3.5 w-3.5" />
                        Ver pedidos de outros dias
                      </Link>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </section>
            );
          })}
        </div>
        </PageShell>
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
      <CancelarPedidoModal
        open={pedidoACancelar !== null}
        orderNumber={pedidoACancelar?.order_number ?? ''}
        loading={pedidoACancelar !== null && cancellingId === pedidoACancelar.id}
        onClose={() => setPedidoACancelar(null)}
        onConfirm={(motivo) => { if (pedidoACancelar) confirmarCancelamento(pedidoACancelar, motivo); }}
      />

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
