/**
 * Order Detail Content — presentational + logic core shared by:
 *  - OrderDetailPage  (full-page route `/stores/:storeId/orders/:id`, kept as
 *    deep-link / print / fallback surface)
 *  - OrderDetailModal (overlay opened from the dashboard via `?pedido=<id>`)
 *
 * It owns ALL data fetching, status transitions, printing, editing, cancel,
 * Uber dispatch and PIX charge generation — nothing was lost in the split from
 * the original page. The outer chrome (full-screen background vs modal panel)
 * is provided by the caller so the same content renders in both surfaces.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeftIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  TruckIcon,
  HomeIcon,
  XMarkIcon,
  PrinterIcon,
  ChevronDownIcon,
  BellIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, Modal, PageLoading } from '../../components/common';
import { OrderDeliveryModal } from '../../components/OrderDeliveryModal';
import { ordersService, paymentsService, getErrorMessage } from '../../services';
import { Order, Payment } from '../../types';

// Helper para parsear endereço (string JSON ou objeto)
const parseAddress = (addr: string | Record<string, unknown> | undefined): Record<string, string> => {
  if (!addr) return {};
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, string>;
      }
      return { address: addr };
    } catch {
      return { address: addr };
    }
  }
  return addr as Record<string, string>;
};
import { useOrderPrint } from '../../components/orders/OrderPrint';
import { EditOrderDrawer } from '../../components/orders/EditOrderDrawer';
import { useStore } from '../../hooks';

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_FLOW = [
  { id: 'pending', label: 'Pendente', icon: ClockIcon },
  { id: 'confirmed', label: 'Confirmado', icon: CheckIcon },
  { id: 'preparing', label: 'Preparando', icon: TruckIcon },
  { id: 'dispatched', label: 'Pronto/Entrega', icon: TruckIcon },
  { id: 'delivered', label: 'Entregue', icon: HomeIcon },
];

// Status aliases for progress tracking
const STATUS_FLOW_ALIAS: Record<string, string> = {
  processing: 'pending',
  paid: 'confirmed',
  ready: 'dispatched',
  out_for_delivery: 'dispatched',
  shipped: 'dispatched',
  completed: 'delivered',
};

// Badges de status nos tokens semânticos do tema (os --*-soft já têm valor
// próprio no dark, então não precisam de variante dark:).
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  confirmed: 'bg-[var(--info-soft)] text-[var(--info)]',
  paid: 'bg-[var(--info-soft)] text-[var(--info)]',
  preparing: 'bg-brand-soft text-[var(--brand)]',
  processing: 'bg-brand-soft text-[var(--brand)]',
  ready: 'bg-[var(--info-soft)] text-[var(--info)]',
  out_for_delivery: 'bg-[var(--info-soft)] text-[var(--info)]',
  shipped: 'bg-[var(--info-soft)] text-[var(--info)]',
  delivered: 'bg-[var(--success-soft)] text-[var(--success)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  cancelled: 'bg-[var(--danger-soft)] text-[var(--danger)]',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  paid: 'Pago',
  preparing: 'Preparando',
  processing: 'Processando',
  ready: 'Pronto',
  out_for_delivery: 'Em Entrega',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatMoney = (value: number | string | undefined | null) => {
  // A API serializa Decimal como STRING ("1234.5"). String.toLocaleString ignora
  // as opções → saía "R$ 1234.5" sem separador BR. Coage pra número antes.
  const n = Number(value);
  return `R$ ${(Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getManualSurcharge = (metadata?: Record<string, unknown>) => {
  const raw = metadata?.manual_surcharge;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw) || 0;
  if (metadata?.manual_adjustment && typeof metadata.manual_adjustment === 'object') {
    const adjustment = metadata.manual_adjustment as Record<string, unknown>;
    const value = adjustment.surcharge;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
  }
  return 0;
};

const getAdjustmentReason = (metadata?: Record<string, unknown>): string | null => {
  if (metadata?.manual_adjustment && typeof metadata.manual_adjustment === 'object') {
    const adjustment = metadata.manual_adjustment as Record<string, unknown>;
    const reason = adjustment.reason;
    if (typeof reason === 'string' && reason.trim()) return reason.trim();
  }
  return null;
};

const getInitials = (name?: string | null) => {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CL';
};

const buildCompactAddress = (address: Record<string, string>) => {
  const line1 = [address.street || address.address, address.number].filter(Boolean).join(', ');
  const line2 = [address.neighborhood, address.city, address.state].filter(Boolean).join(' • ');
  const line3 = address.zip_code || address.cep || '';
  const structured = [line1, line2, line3].filter(Boolean).join(' · ');
  return structured || address.raw_address || '';
};

const formatOrderCreatedAt = (value?: string | null) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return format(parsed, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
};

// Monta o rótulo de agendamento ("15 de janeiro às 14:30") a partir de scheduled_date/time.
const formatScheduledLabel = (
  order: { scheduled_date?: string | null; scheduled_time?: string | null },
): string => {
  const { scheduled_date, scheduled_time } = order;
  if (!scheduled_date && !scheduled_time) return '';

  let datePart = '';
  if (scheduled_date) {
    const [y, m, d] = scheduled_date.split('-').map(Number);
    if (y && m && d) {
      const parsed = new Date(y, m - 1, d);
      datePart = Number.isNaN(parsed.getTime())
        ? scheduled_date
        : format(parsed, "dd 'de' MMMM", { locale: ptBR });
    } else {
      datePart = scheduled_date;
    }
  }

  const timePart = scheduled_time ? scheduled_time.slice(0, 5) : '';
  if (datePart && timePart) return `${datePart} às ${timePart}`;
  return datePart || timePart;
};

const getStatusIndex = (status: string): number => {
  const normalized = STATUS_FLOW_ALIAS[status.toLowerCase()] ?? status.toLowerCase();
  const index = STATUS_FLOW.findIndex(s => s.id === normalized);
  return index >= 0 ? index : 0;
};

// =============================================================================
// PROGRESS TIMELINE COMPONENT
// =============================================================================

interface ProgressTimelineProps {
  currentStatus: string;
  isCancelled?: boolean;
}

const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ currentStatus, isCancelled }) => {
  const currentIndex = getStatusIndex(currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-3 px-6 py-3 bg-[var(--danger-soft)] rounded-full">
          <XMarkIcon className="w-6 h-6 text-[var(--danger)]" />
          <span className="text-lg font-semibold text-[var(--danger)]">Pedido Cancelado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 relative">
        {/* Progress Line */}
        <div className="absolute left-6 right-6 top-5 h-px bg-border-token z-0" />
        <div
          className="absolute left-6 top-5 h-px bg-[var(--brand)] z-0 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (STATUS_FLOW.length - 1)) * 100}% - 3rem)` }}
        />

        {/* Steps */}
        {STATUS_FLOW.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted
                    ? 'bg-[var(--brand)] text-brand-strong'
                    : 'bg-surface border border-border-token text-fg-muted-token'}
                  ${isCurrent ? 'ring-4 ring-brand-soft scale-110' : ''}
                `}
              >
                {isCompleted && index < currentIndex ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`
                  mt-2 text-[11px] font-medium whitespace-nowrap
                  ${isCompleted ? 'text-fg-token' : 'text-fg-muted-token'}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN CONTENT COMPONENT
// =============================================================================

export interface OrderDetailContentProps {
  /** Order to display/act on. */
  orderId: string;
  /** Back-button / load-error / cancel-flow exit. Page → navigate; Modal → close. */
  onClose: () => void;
  /**
   * Called after any mutation (status advance, PIX charge, edit) with the fresh
   * order, so the surrounding surface (Kanban board, dashboard list) can update
   * without a full reload. Also fires once after the initial load.
   */
  onOrderChanged?: (order: Order) => void;
  /** 'page' keeps the ArrowLeft label as "voltar"; 'modal' as "fechar". */
  variant?: 'page' | 'modal';
  /**
   * Avisa quando um sub-modal interno (cancelar, editar, Uber) abre/fecha.
   * O <OrderDetailModal /> externo usa isso pra desligar Escape/click-fora
   * enquanto um sub-modal está por cima — senão o Escape fecharia os dois.
   */
  onNestedOpenChange?: (open: boolean) => void;
}

export const OrderDetailContent: React.FC<OrderDetailContentProps> = ({
  orderId,
  onClose,
  onOrderChanged,
  variant = 'page',
  onNestedOpenChange,
}) => {
  const id = orderId;
  const { printOrder } = useOrderPrint();
  const { store } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUberModal, setShowUberModal] = useState(false);
  const [editing, setEditing] = useState(false);
  // Fase 3 — geração de cobrança PIX (link de pagamento)
  const [chargeAmount, setChargeAmount] = useState<string>('');
  const [generatingCharge, setGeneratingCharge] = useState(false);
  const [generatedPix, setGeneratedPix] = useState<
    { pix_code?: string; pix_qr_code?: string; ticket_url?: string } | null
  >(null);

  // Imprime o pedido. hidePrices=true gera a comanda da cozinha (sem valores/pagamento).
  const handlePrint = async (hidePrices = false) => {
    if (!order) return;
    const printOpts = (target: Order | null | undefined) => ({
      storeName: store?.name || target?.store_name || order.store_name || 'Loja',
      storePhone: store?.phone || store?.whatsapp_number || '',
      storeAddress: store?.address && store?.city && store?.state
        ? `${store.address} - ${store.city}/${store.state}`
        : (store?.address || store?.city || store?.state || ''),
      hidePrices,
    });
    try {
      const freshOrder = id ? await ordersService.getOrder(id) : order;
      printOrder(freshOrder as any, printOpts(freshOrder));
    } catch {
      printOrder(order as any, printOpts(order));
    }
  };

  useEffect(() => {
    if (id) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reporta pro modal externo quando um sub-modal está aberto (cancelar/editar/Uber),
  // pra ele suspender o fechamento por Escape / click-fora enquanto isso.
  const nestedOpen = showCancelModal || showUberModal || editing;
  useEffect(() => {
    onNestedOpenChange?.(nestedOpen);
  }, [nestedOpen, onNestedOpenChange]);

  // Default do valor da cobrança = saldo faltante (amount_due) ao carregar o pedido.
  useEffect(() => {
    if (order?.amount_due !== undefined && order?.amount_due !== null) {
      setChargeAmount(String(order.amount_due));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const handleGenerateCharge = async () => {
    if (!order) return;
    const raw = chargeAmount.trim().replace(',', '.');
    const parsed = raw ? Number(raw) : undefined;
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed <= 0)) {
      toast.error('Informe um valor válido para a cobrança.');
      return;
    }
    setGeneratingCharge(true);
    try {
      // "igual ao adjust": usa a rota global (sem slug), mesma da edição de pedido.
      const { payment, order: updated } = await ordersService.generatePayment(order.id, {
        amount: parsed,
        payment_method: 'pix',
      });
      setOrder(updated);
      onOrderChanged?.(updated);
      setGeneratedPix({
        pix_code: (payment.pix_code as string) || undefined,
        pix_qr_code: (payment.pix_qr_code as string) || undefined,
        ticket_url: (payment.ticket_url as string) || (payment.pix_ticket_url as string) || undefined,
      });
      const fresh = await paymentsService.getByOrder(order.id).catch(() => payments);
      setPayments(fresh);
      toast.success('Cobrança PIX gerada!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGeneratingCharge(false);
    }
  };

  const handleCopyPix = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success('Código PIX copiado!');
  };

  // Silenciar mensagens automáticas de WhatsApp deste pedido (balcão):
  // enquanto ativo, o backend pula todas as notificações de status.
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const notificationsSuppressed = Boolean(order?.metadata?.suppress_notifications);
  const handleToggleNotifications = async () => {
    if (!order || togglingNotifications) return;
    setTogglingNotifications(true);
    try {
      const updated = await ordersService.setSuppressNotifications(order.id, !notificationsSuppressed);
      setOrder(updated);
      onOrderChanged?.(updated);
      toast.success(
        !notificationsSuppressed
          ? 'Notificações silenciadas — mudar o status não envia WhatsApp.'
          : 'Notificações reativadas para este pedido.'
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTogglingNotifications(false);
    }
  };

  const loadOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [orderData, paymentsData] = await Promise.all([
        ordersService.getOrder(id),
        paymentsService.getByOrder(id).catch(() => []),
      ]);
      setOrder(orderData);
      setPayments(paymentsData);
      onOrderChanged?.(orderData);
    } catch (error) {
      // Antes fazia onClose() → em erro transitório o usuário era ejetado da
      // tela (e na variante page, navegava pra lista). Agora mostra retry.
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!order) return;
    setActionLoading(action);
    try {
      let updated: Order;
      switch (action) {
        case 'confirm':
          updated = await ordersService.updateStatus(order.id, 'confirmed');
          break;
        case 'prepare':
          updated = await ordersService.updateStatus(order.id, 'preparing');
          break;
        case 'ready':
          updated = await ordersService.updateStatus(order.id, 'ready');
          break;
        case 'deliver':
          updated = await ordersService.updateStatus(order.id, 'out_for_delivery');
          break;
        case 'complete':
          updated = await ordersService.updateStatus(order.id, 'delivered');
          break;
        case 'cancel':
          updated = await ordersService.updateStatus(order.id, 'cancelled');
          setShowCancelModal(false);
          break;
        default:
          return;
      }
      setOrder(updated);
      onOrderChanged?.(updated);
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  // Get next action based on current status
  const nextAction = useMemo(() => {
    if (!order) return null;
    const status = order.status.toLowerCase();

    // Um único CTA de marca (ouro sobre carvão) — a etiqueta já diz o passo;
    // cor por status virava um arco-íris fora da paleta do painel.
    const actions: Record<string, { action: string; label: string }> = {
      pending: { action: 'confirm', label: 'Confirmar Pedido' },
      confirmed: { action: 'prepare', label: 'Iniciar Preparo' },
      paid: { action: 'prepare', label: 'Iniciar Preparo' },
      preparing: { action: 'ready', label: 'Marcar como Pronto' },
      processing: { action: 'prepare', label: 'Iniciar Preparo' },
      ready: { action: 'deliver', label: 'Saiu para Entrega' },
      out_for_delivery: { action: 'complete', label: 'Marcar Entregue' },
      shipped: { action: 'complete', label: 'Marcar Entregue' },
    };

    return actions[status] || null;
  }, [order]);

  const isCancelled = order?.status.toLowerCase() === 'cancelled';
  const isCompleted = ['delivered', 'completed'].includes(order?.status.toLowerCase() || '');

  if (isLoading) {
    return <PageLoading />;
  }

  if (loadError && !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded border border-border-token bg-surface px-6 py-12 text-center">
        <XMarkIcon className="h-10 w-10 text-[var(--danger)]" />
        <div>
          <p className="text-base font-semibold text-fg-token">
            Não foi possível carregar o pedido
          </p>
          <p className="mt-1 text-sm text-fg-muted-token">{loadError}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            {variant === 'modal' ? 'Fechar' : 'Voltar'}
          </Button>
          <Button variant="primary" onClick={() => loadOrder()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return <PageLoading />;
  }

  const statusColors = STATUS_COLORS[order.status.toLowerCase()] || STATUS_COLORS.pending;
  const address = parseAddress(order.delivery_address || order.shipping_address);
  const paymentStatus = order.payment_status || 'pending';
  const paymentStatusLabel: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    paid: 'Pago',
    failed: 'Falhou',
    refunded: 'Reembolsado',
  };
  const paymentMethodLabel: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    cash: 'Dinheiro',
    card: 'Cartão',
    mercadopago: 'Mercado Pago',
  };
  const paymentLink = order.pix_ticket_url || order.payment_url || order.payment_link || order.init_point || null;
  // Fase 3 — saldo de pagamento (campos read-only do backend; podem não existir em respostas antigas)
  const hasPaymentBalance = order.amount_due !== undefined && order.amount_due !== null;
  const amountDue = Number(order.amount_due ?? 0);
  const isFullyPaid = order.is_fully_paid === true || (hasPaymentBalance && amountDue <= 0);
  const compactAddress = buildCompactAddress(address);
  const customerInitials = getInitials(order.customer_name);
  const manualSurcharge =
    Number(order.surcharge_value ?? order.metadata?.manual_surcharge ?? 0) || 0;
  const adjustmentReason =
    order.surcharge_reason?.trim() ||
    order.manual_discount_reason?.trim() ||
    getAdjustmentReason(order.metadata);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
        <section className="rounded border border-border-token bg-surface p-5 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <button
                  onClick={onClose}
                  aria-label={variant === 'modal' ? 'Fechar' : 'Voltar'}
                  className="flex h-11 w-11 items-center justify-center rounded border border-border-token bg-surface text-fg-token transition hover:bg-surface-2"
                >
                  {variant === 'modal' ? <XMarkIcon className="h-5 w-5" /> : <ArrowLeftIcon className="h-5 w-5" />}
                </button>
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-[var(--brand)]">
                    Pedido Nº {order.order_number}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-brand-strong text-base font-semibold text-[var(--brand)]">
                      {customerInitials}
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-3xl font-semibold tracking-[-0.04em] text-fg-token sm:text-4xl">
                        {order.customer_name || 'Cliente sem nome'}
                      </h1>
                      <p className="mt-1 text-sm text-fg-muted-token">
                        {formatOrderCreatedAt(order.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColors}`}>
                  {STATUS_LABELS[order.status.toLowerCase()] || order.status}
                </span>
                <span className="rounded-full border border-brand-soft bg-brand-soft px-4 py-2 text-sm font-semibold text-fg-token">
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>

            <div aria-hidden="true">
              <div className="h-[2px] bg-[var(--brand)]" />
              <div className="mt-[3px] h-px bg-[var(--brand)] opacity-40" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded border border-border-token bg-canvas px-4 py-3">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Contato</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                  <PhoneIcon className="h-4 w-4 text-[var(--brand)]" />
                  {order.customer_phone ? (
                    <a href={`tel:${order.customer_phone}`} className="hover:underline">
                      {order.customer_phone}
                    </a>
                  ) : (
                    <span className="text-fg-muted-token">Não informado</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={togglingNotifications}
                  aria-pressed={notificationsSuppressed}
                  title={notificationsSuppressed
                    ? 'As mensagens automáticas de status estão silenciadas para este pedido. Clique para reativar.'
                    : 'Silenciar as mensagens automáticas de WhatsApp deste pedido (ex.: pedido de balcão).'}
                  className={`mt-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    notificationsSuppressed
                      ? 'bg-[var(--warning)]/15 text-[var(--warning)]'
                      : 'text-fg-muted-token hover:bg-surface-2'
                  }`}
                >
                  {notificationsSuppressed ? (
                    <>
                      <BellSlashIcon className="h-4 w-4" />
                      Notificações silenciadas
                    </>
                  ) : (
                    <>
                      <BellIcon className="h-4 w-4" />
                      Notificar cliente: ativo
                    </>
                  )}
                </button>
              </div>

              <div className="rounded border border-border-token bg-canvas px-4 py-3">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Entrega</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                  {order.delivery_method === 'pickup' ? (
                    <>
                      <HomeIcon className="h-4 w-4 text-[var(--brand)]" />
                      <span>Retirada no balcão</span>
                    </>
                  ) : (
                    <>
                      <TruckIcon className="h-4 w-4 text-[var(--brand)]" />
                      <span>Delivery</span>
                    </>
                  )}
                </div>
                {formatScheduledLabel(order) && (
                  <div className="mt-2 flex items-center gap-2 rounded bg-[var(--brand)]/10 px-2 py-1.5 text-xs font-semibold text-[var(--brand)]">
                    <ClockIcon className="h-4 w-4" />
                    Agendado: {formatScheduledLabel(order)}
                  </div>
                )}
              </div>

              <div className="rounded border border-border-token bg-canvas px-4 py-3">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Pagamento</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {paymentMethodLabel[order.payment_method || ''] || order.payment_method || 'Não informado'}
                  </span>
                  <span className={`font-semibold ${paymentStatus === 'paid' ? 'text-[var(--success)]' : paymentStatus === 'failed' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                    {paymentStatusLabel[paymentStatus] || paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded border border-border-token bg-surface-2 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand)]">
                    Progresso operacional
                  </p>
                  <p className="mt-1 text-sm text-fg-muted-token">
                    Avance o pedido sem sair da tela.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressTimeline currentStatus={order.status} isCancelled={isCancelled} />
              </div>
            </div>

            <div className="rounded border border-border-token bg-surface px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Itens do pedido</h2>
                  <p className="text-sm text-fg-muted-token">
                    Resumo compacto para conferência rápida.
                  </p>
                </div>
                <span className="text-sm font-semibold text-fg-muted-token">
                  {order.items?.length || 0} item(ns)
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {order.items?.map((item, index) => {
                  const isSalad = !!(item.options?.is_salad_builder);
                  return (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded border border-border-token bg-surface-2 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {item.quantity}x {item.product_name}
                          </span>
                          {isSalad && (
                            <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--success)]">
                              Salada
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-fg-muted-token">
                          {formatMoney(item.unit_price)} cada
                        </p>
                        {item.notes && (
                          <p className="mt-1 text-xs text-fg-muted-token">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm font-semibold">
                        {formatMoney(item.subtotal)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-2 rounded border border-dashed border-border-token px-4 py-4 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-fg-muted-token">Subtotal</span>
                  <span className="font-semibold">{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-fg-muted-token">Entrega</span>
                  <span className="font-semibold">{formatMoney(order.delivery_fee || order.shipping_cost)}</span>
                </div>
                {order.discount ? (
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-fg-muted-token">Desconto</span>
                      <span className="font-semibold text-[var(--success)]">-{formatMoney(order.discount)}</span>
                    </div>
                    {order.manual_discount_reason?.trim() ? (
                      <p className="mt-0.5 text-xs italic text-fg-muted-token">
                        {order.manual_discount_reason.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {manualSurcharge > 0 ? (
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-fg-muted-token">Acréscimo</span>
                      <span className="font-semibold">{formatMoney(manualSurcharge)}</span>
                    </div>
                    {order.surcharge_reason?.trim() ? (
                      <p className="mt-0.5 text-xs italic text-fg-muted-token">
                        {order.surcharge_reason.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {!order.surcharge_reason?.trim() && !order.manual_discount_reason?.trim() && adjustmentReason ? (
                  <div className="sm:col-span-2 text-xs text-fg-muted-token italic">
                    {adjustmentReason}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-border-token pt-3 text-base sm:col-span-2">
                  <span className="font-semibold">Total do pedido</span>
                  <span className="text-xl font-semibold tracking-[-0.03em]">{formatMoney(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Saldo de pagamento (Fase 3) */}
            {hasPaymentBalance && (
              amountDue > 0 ? (
                <div
                  role="status"
                  className="flex items-center justify-between gap-3 rounded border border-border-token bg-[var(--warning-soft)] px-4 py-4 text-fg-token sm:px-5"
                >
                  <span className="text-sm font-semibold">Falta receber</span>
                  <span className="text-lg font-semibold tracking-[-0.02em]">{formatMoney(amountDue)}</span>
                </div>
              ) : (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded border border-border-token bg-[var(--success-soft)] px-4 py-4 text-sm font-semibold text-[var(--success)] sm:px-5"
                >
                  <CheckIcon className="h-5 w-5" />
                  Pago integralmente
                </div>
              )
            )}

            {/* Notes — always visible, critical for kitchen ops */}
            {(order.customer_notes || order.notes) && (
              <div className="rounded border border-border-token bg-[var(--warning-soft)] px-4 py-4 text-fg-token sm:px-5">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em] mb-2 text-[var(--warning)]">Observações do cliente</p>
                <p className="text-sm leading-relaxed">{order.customer_notes || order.notes}</p>
              </div>
            )}

            {/* Delivery address — always visible for delivery orders */}
            {compactAddress && order.delivery_method !== 'pickup' && (
              <div className="rounded border border-border-token bg-surface px-4 py-4 sm:px-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] mb-2 text-fg-muted-token">Endereço de entrega</p>
                <div className="flex items-start gap-2 text-sm">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>{compactAddress}</span>
                </div>
              </div>
            )}

            {/* Payment details — secondary info in collapsible */}
            {(paymentLink || order.pix_code || payments.length > 0 || (hasPaymentBalance && amountDue > 0)) && (
              <details className="group rounded border border-border-token bg-surface px-4 py-4 sm:px-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Dados de pagamento</h2>
                  </div>
                  <ChevronDownIcon className="h-5 w-5 text-fg-muted-token transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 space-y-4 text-sm">
                  {/* F3 — gerar cobrança PIX da diferença */}
                  {amountDue > 0 && (
                    <div className="space-y-3 rounded border border-dashed border-brand-soft bg-surface px-4 py-4 ">
                      <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                        Gerar cobrança PIX
                      </p>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-xs">
                          <span className="text-fg-muted-token">Valor da cobrança (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label="Valor da cobrança"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            className="w-36 rounded border border-border-token bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateCharge}
                          disabled={generatingCharge}
                          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-brand-strong transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
                        >
                          {generatingCharge ? 'Gerando...' : 'Gerar cobrança PIX'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* F3 — PIX recém-gerado: copia-e-cola + QR + link */}
                  {generatedPix && (
                    <div className="space-y-3 rounded border border-brand-soft bg-surface px-4 py-4 ">
                      {generatedPix.pix_code && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold">PIX copia e cola</span>
                          <div className="flex items-center gap-2">
                            <code className="block flex-1 break-all rounded border border-dashed border-border-token px-3 py-2 text-xs">
                              {generatedPix.pix_code}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyPix(generatedPix.pix_code!)}
                              className="shrink-0 rounded-full border border-border-token px-3 py-2 text-xs font-medium hover:bg-surface-2"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                      )}
                      {generatedPix.pix_qr_code && (
                        <img
                          src={generatedPix.pix_qr_code.startsWith('data:')
                            ? generatedPix.pix_qr_code
                            : `data:image/png;base64,${generatedPix.pix_qr_code}`}
                          alt="QR Code PIX"
                          className="h-40 w-40 rounded border border-border-token"
                        />
                      )}
                      {generatedPix.ticket_url && (
                        <a
                          href={generatedPix.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full border border-border-token px-4 py-2 font-medium hover:bg-surface-2"
                        >
                          Abrir link de pagamento
                        </a>
                      )}
                    </div>
                  )}

                  {/* F4 — lista de cobranças do pedido */}
                  {payments.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                        Cobranças
                      </p>
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between gap-3 rounded border border-border-token px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {payment.payment_method === 'pix' ? 'PIX' :
                               payment.payment_method === 'credit_card' ? 'Cartão' :
                               payment.payment_method === 'cash' ? 'Dinheiro' :
                               payment.payment_method}
                            </p>
                            <p className="text-xs text-fg-muted-token">
                              {paymentStatusLabel[payment.status] || payment.status}
                            </p>
                          </div>
                          <span className="font-semibold">{formatMoney(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.pix_code && (
                    <div className="break-all rounded border border-dashed border-border-token px-4 py-3 text-xs">
                      <span className="font-semibold">PIX copia e cola:</span> {order.pix_code}
                    </div>
                  )}

                  {paymentLink && (
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-border-token px-4 py-2 font-medium hover:bg-surface-2"
                    >
                      Abrir link de pagamento
                    </a>
                  )}
                </div>
              </details>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded border border-[var(--border-strong)] bg-brand-strong p-5 text-canvas dark:text-fg-token sm:p-6">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand)]">
              Ação principal
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {nextAction ? nextAction.label : isCancelled ? 'Pedido cancelado' : 'Pedido concluído'}
            </h2>
            <p className="mt-2 text-sm opacity-70">
              Só o próximo passo operacional fica em destaque.
            </p>

            {nextAction && !isCancelled && !isCompleted && (
              <button
                onClick={() => handleAction(nextAction.action)}
                disabled={!!actionLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded bg-[var(--brand)] px-4 py-4 text-base font-semibold text-brand-strong transition-transform hover:-translate-y-0.5 hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === nextAction.action ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    {nextAction.label}
                  </>
                )}
              </button>
            )}

            {order && order.delivery_method === 'delivery' && !isCancelled && !isCompleted && (
              <button
                onClick={() => setShowUberModal(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-white/15 px-4 py-3 text-base font-semibold transition-colors hover:bg-white/5"
              >
                <TruckIcon className="h-5 w-5" />
                Enviar para Uber Direct
              </button>
            )}

            <div className="mt-6 grid gap-2">
              <button
                onClick={() => handlePrint(false)}
                className="flex items-center justify-center gap-2 rounded border border-white/15 px-4 py-3 text-sm font-medium transition hover:bg-white/5"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimir (completo)
              </button>

              <button
                onClick={() => handlePrint(true)}
                className="flex items-center justify-center gap-2 rounded border border-[var(--brand)]/30 px-4 py-3 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)]/10"
              >
                <PrinterIcon className="h-4 w-4" />
                Comanda cozinha (sem preços)
              </button>

              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-2 rounded border border-white/15 px-4 py-3 text-sm font-medium transition hover:bg-white/5"
              >
                Editar pedido
              </button>

              {!isCancelled && !isCompleted && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center justify-center gap-2 rounded border border-white/10 px-4 py-3 text-sm font-medium text-danger-400 transition hover:bg-white/5"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>

          <div className="rounded border border-border-token bg-surface p-5 sm:p-6">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand)]">
              Leitura rápida
            </p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-muted-token">Status</span>
                <span className="text-sm font-semibold">{STATUS_LABELS[order.status.toLowerCase()] || order.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-muted-token">Itens</span>
                <span className="text-sm font-semibold">{order.items?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-muted-token">Total</span>
                <span className="text-sm font-semibold">{formatMoney(order.total)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-fg-muted-token">Criado</span>
                <span className="text-sm font-semibold">{format(order.created_at ? new Date(order.created_at) : new Date(), 'HH:mm')}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Edit Order Drawer */}
      {editing && (
        <EditOrderDrawer
          order={order}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); loadOrder(); }}
        />
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Pedido"
      >
        <div className="space-y-4">
          <p className="text-fg-muted-token">
            Tem certeza que deseja cancelar o pedido <strong>#{order.order_number}</strong>?
          </p>
          <p className="text-sm text-[var(--danger)]">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => handleAction('cancel')}
              isLoading={actionLoading === 'cancel'}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Uber Delivery Modal */}
      {order && (
        <OrderDeliveryModal
          orderId={order.id}
          storeSlug={store?.slug || ''}
          isOpen={showUberModal}
          onClose={() => setShowUberModal(false)}
          onAccept={(driver) => {
            toast.success(`Motorista ${driver.name} confirmado!`);
            setShowUberModal(false);
            // Recarrega: confirmar motorista altera status/entrega no backend.
            loadOrder();
          }}
        />
      )}
    </>
  );
};

export default OrderDetailContent;
