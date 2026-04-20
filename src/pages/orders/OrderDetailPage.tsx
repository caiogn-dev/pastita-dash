/**
 * Order Detail Page - Clean & Modern Design
 * 
 * Minimalist design focused on:
 * - Clear visual hierarchy
 * - Essential information only
 * - Intuitive actions
 * - Beautiful progress timeline
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, Modal, PageLoading } from '../../components/common';
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
import { useStore } from '../../hooks';

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_FLOW = [
  { id: 'pending', label: 'Pendente', icon: ClockIcon, color: 'yellow' },
  { id: 'confirmed', label: 'Confirmado', icon: CheckIcon, color: 'blue' },
  { id: 'preparing', label: 'Preparando', icon: TruckIcon, color: 'orange' },
  { id: 'delivered', label: 'Entregue', icon: HomeIcon, color: 'green' },
];

// Status aliases for progress tracking (intermediate states map to flow steps)
const STATUS_FLOW_ALIAS: Record<string, string> = {
  processing: 'pending',
  paid: 'confirmed',
  ready: 'preparing',
  out_for_delivery: 'preparing',
  shipped: 'preparing',
  completed: 'delivered',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  paid: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  preparing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  processing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  ready: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  out_for_delivery: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  shipped: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
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

const formatMoney = (value: number | undefined | null) => {
  return `R$ ${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
        <div className="flex items-center gap-3 px-6 py-3 bg-red-50 rounded-full">
          <XMarkIcon className="w-6 h-6 text-red-500" />
          <span className="text-lg font-semibold text-red-700 dark:text-red-300">Pedido Cancelado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 relative">
        {/* Progress Line */}
        <div className="absolute left-6 right-6 top-5 h-px bg-black/10 dark:bg-white/10 z-0" />
        <div 
          className="absolute left-6 top-5 h-px bg-[#c97a36] z-0 transition-all duration-500"
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
                    ? 'bg-[#1f1f1f] text-[#f5f1e8] shadow-lg shadow-black/15 dark:bg-[#f4efe6] dark:text-[#111]' 
                    : 'bg-[#faf7f1] border border-black/10 text-gray-400 dark:bg-[#111] dark:border-white/10'}
                  ${isCurrent ? 'ring-4 ring-[#c97a36]/15 scale-110' : ''}
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
                  ${isCompleted ? 'text-[#1f1f1f] dark:text-[#f4efe6]' : 'text-gray-400 dark:text-zinc-500'}
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
// MAIN COMPONENT
// =============================================================================

export const OrderDetailPage: React.FC = () => {
  const { id, storeId: routeStoreId } = useParams<{ id: string; storeId?: string }>();
  const navigate = useNavigate();
  const { printOrder } = useOrderPrint();
  const { store, stores } = useStore();
  const storeRouteBase = useMemo(() => {
    if (!routeStoreId) return store?.id || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || store?.id || null;
  }, [routeStoreId, store?.id, stores]);
  const ordersRoute = storeRouteBase ? `/stores/${storeRouteBase}/orders` : '/stores';
  
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [orderData, paymentsData] = await Promise.all([
        ordersService.getOrder(id),
        paymentsService.getByOrder(id).catch(() => []),
      ]);
      setOrder(orderData);
      setPayments(paymentsData);
    } catch (error) {
      toast.error(getErrorMessage(error));
      navigate(ordersRoute);
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
    
    const actions: Record<string, { action: string; label: string; color: string }> = {
      pending: { action: 'confirm', label: 'Confirmar Pedido', color: 'bg-blue-500 hover:bg-blue-600' },
      confirmed: { action: 'prepare', label: 'Iniciar Preparo', color: 'bg-orange-500 hover:bg-orange-600' },
      paid: { action: 'prepare', label: 'Iniciar Preparo', color: 'bg-orange-500 hover:bg-orange-600' },
      preparing: { action: 'ready', label: 'Marcar como Pronto', color: 'bg-purple-500 hover:bg-purple-600' },
      processing: { action: 'prepare', label: 'Iniciar Preparo', color: 'bg-orange-500 hover:bg-orange-600' },
      ready: { action: 'deliver', label: 'Saiu para Entrega', color: 'bg-indigo-500 hover:bg-indigo-600' },
      out_for_delivery: { action: 'complete', label: 'Marcar Entregue', color: 'bg-green-500 hover:bg-green-600' },
      shipped: { action: 'complete', label: 'Marcar Entregue', color: 'bg-green-500 hover:bg-green-600' },
    };
    
    return actions[status] || null;
  }, [order]);

  const isCancelled = order?.status.toLowerCase() === 'cancelled';
  const isCompleted = ['delivered', 'completed'].includes(order?.status.toLowerCase() || '');

  if (isLoading || !order) {
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
  const compactAddress = buildCompactAddress(address);
  const customerInitials = getInitials(order.customer_name);

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#171717] dark:bg-[#050505] dark:text-[#f4efe6]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
          <section className="rounded-[28px] border border-black/10 bg-[#fbf8f2] p-5 shadow-[0_24px_80px_rgba(15,15,15,0.08)] dark:border-white/10 dark:bg-[#0b0b0b] dark:shadow-none sm:p-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <button
                    onClick={() => navigate(ordersRoute)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-gray-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8f7e] dark:text-[#8b816f]">
                      Pedido #{order.order_number}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171717] text-base font-semibold text-[#f5f1e8] dark:bg-[#f4efe6] dark:text-[#111]">
                        {customerInitials}
                      </div>
                      <div className="min-w-0">
                        <h1 className="truncate text-3xl font-semibold tracking-[-0.04em] text-[#171717] dark:text-[#f4efe6] sm:text-4xl">
                          {order.customer_name || 'Cliente sem nome'}
                        </h1>
                        <p className="mt-1 text-sm text-[#746b5f] dark:text-[#9d9385]">
                          {formatOrderCreatedAt(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                    {STATUS_LABELS[order.status.toLowerCase()] || order.status}
                  </span>
                  <span className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#5f564b] dark:border-white/10 dark:text-[#ada392]">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a8f7e] dark:text-[#8b816f]">Contato</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <PhoneIcon className="h-4 w-4 text-[#c97a36]" />
                    {order.customer_phone ? (
                      <a href={`tel:${order.customer_phone}`} className="hover:underline">
                        {order.customer_phone}
                      </a>
                    ) : (
                      <span className="text-[#746b5f] dark:text-[#9d9385]">Não informado</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a8f7e] dark:text-[#8b816f]">Entrega</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    {order.delivery_method === 'pickup' ? (
                      <>
                        <HomeIcon className="h-4 w-4 text-[#c97a36]" />
                        <span>Retirada no balcão</span>
                      </>
                    ) : (
                      <>
                        <TruckIcon className="h-4 w-4 text-[#c97a36]" />
                        <span>Delivery</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a8f7e] dark:text-[#8b816f]">Pagamento</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {paymentMethodLabel[order.payment_method || ''] || order.payment_method || 'Não informado'}
                    </span>
                    <span className={`font-semibold ${paymentStatus === 'paid' ? 'text-green-600' : paymentStatus === 'failed' ? 'text-red-500' : 'text-[#c97a36]'}`}>
                      {paymentStatusLabel[paymentStatus] || paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-[#f3eee4] px-4 py-4 dark:border-white/10 dark:bg-[#0f0f0f] sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8f7e] dark:text-[#8b816f]">
                      Progresso operacional
                    </p>
                    <p className="mt-1 text-sm text-[#746b5f] dark:text-[#9d9385]">
                      Avance o pedido sem sair da tela.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressTimeline currentStatus={order.status} isCancelled={isCancelled} />
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/5 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Itens do pedido</h2>
                    <p className="text-sm text-[#746b5f] dark:text-[#9d9385]">
                      Resumo compacto para conferência rápida.
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#5f564b] dark:text-[#b2a795]">
                    {order.items?.length || 0} item(ns)
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {order.items?.map((item, index) => {
                    const isSalad = !!(item.options?.is_salad_builder);
                    return (
                      <div
                        key={item.id || index}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-black/5 bg-[#fbf8f2] px-4 py-3 dark:border-white/5 dark:bg-[#0b0b0b]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {item.quantity}x {item.product_name}
                            </span>
                            {isSalad && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                Salada
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#746b5f] dark:text-[#9d9385]">
                            {formatMoney(item.unit_price)} cada
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs text-[#9a8f7e] dark:text-[#8b816f]">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {formatMoney(item.subtotal || item.total_price)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-dashed border-black/10 px-4 py-4 text-sm dark:border-white/10 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#746b5f] dark:text-[#9d9385]">Subtotal</span>
                    <span className="font-semibold">{formatMoney(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#746b5f] dark:text-[#9d9385]">Entrega</span>
                    <span className="font-semibold">{formatMoney(order.delivery_fee || order.shipping_cost)}</span>
                  </div>
                  {order.discount ? (
                    <div className="flex items-center justify-between gap-3 sm:col-span-2">
                      <span className="text-[#746b5f] dark:text-[#9d9385]">Desconto</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">-{formatMoney(order.discount)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-base sm:col-span-2 dark:border-white/10">
                    <span className="font-semibold">Total do pedido</span>
                    <span className="text-xl font-semibold tracking-[-0.03em]">{formatMoney(order.total)}</span>
                  </div>
                </div>
              </div>

              {(order.notes || compactAddress || paymentLink || order.pix_code || payments.length > 0) && (
                <details className="group rounded-[24px] border border-black/10 bg-white/55 px-4 py-4 dark:border-white/10 dark:bg-white/5 sm:px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">Detalhes adicionais</h2>
                      <p className="text-sm text-[#746b5f] dark:text-[#9d9385]">
                        Endereço, observações e dados de pagamento em segundo plano.
                      </p>
                    </div>
                    <ChevronDownIcon className="h-5 w-5 text-[#746b5f] transition group-open:rotate-180 dark:text-[#9d9385]" />
                  </summary>

                  <div className="mt-4 space-y-4 text-sm">
                    {order.notes && (
                      <div className="rounded-2xl bg-[#f8edd0] px-4 py-3 text-[#6a5731] dark:bg-[#2b2417] dark:text-[#d8c18c]">
                        {order.notes}
                      </div>
                    )}

                    {compactAddress && (
                      <div className="flex items-start gap-2 rounded-2xl border border-black/5 px-4 py-3 dark:border-white/5">
                        <MapPinIcon className="mt-0.5 h-4 w-4 text-[#c97a36]" />
                        <span>{compactAddress}</span>
                      </div>
                    )}

                    {payments.length > 0 && (
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 px-4 py-3 dark:border-white/5">
                            <div>
                              <p className="font-medium">
                                {payment.payment_method === 'pix' ? 'PIX' :
                                 payment.payment_method === 'credit_card' ? 'Cartão' :
                                 payment.payment_method === 'cash' ? 'Dinheiro' :
                                 payment.payment_method}
                              </p>
                              <p className="text-xs text-[#746b5f] dark:text-[#9d9385]">
                                {payment.status}
                              </p>
                            </div>
                            <span className="font-semibold">{formatMoney(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {order.pix_code && (
                      <div className="break-all rounded-2xl border border-dashed border-black/10 px-4 py-3 text-xs dark:border-white/10">
                        <span className="font-semibold">PIX copia e cola:</span> {order.pix_code}
                      </div>
                    )}

                    {paymentLink && (
                      <a
                        href={paymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full border border-black/10 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
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
            <div className="rounded-[28px] border border-black/10 bg-[#171717] p-5 text-[#f5f1e8] shadow-[0_24px_80px_rgba(15,15,15,0.18)] dark:border-white/10 dark:bg-[#111] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#bda98d]">
                Ação principal
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {nextAction ? nextAction.label : isCancelled ? 'Pedido cancelado' : 'Pedido concluído'}
              </h2>
              <p className="mt-2 text-sm text-[#c9bca9]">
                Só o próximo passo operacional fica em destaque.
              </p>

              {nextAction && !isCancelled && !isCompleted && (
                <button
                  onClick={() => handleAction(nextAction.action)}
                  disabled={!!actionLoading}
                  className={`
                    mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-semibold text-white
                    transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50
                    ${nextAction.color}
                  `}
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

              <div className="mt-6 grid gap-2">
                <button
                  onClick={async () => {
                    try {
                      const freshOrder = id ? await ordersService.getOrder(id) : order;
                      printOrder(freshOrder as any, {
                        storeName: store?.name || freshOrder?.store_name || order.store_name || 'Loja',
                        storePhone: store?.phone || store?.whatsapp_number || '',
                        storeAddress: store?.address && store?.city && store?.state
                          ? `${store.address} - ${store.city}/${store.state}`
                          : (store?.address || store?.city || store?.state || ''),
                      });
                    } catch {
                      printOrder(order as any, {
                        storeName: store?.name || order.store_name || 'Loja',
                        storePhone: store?.phone || store?.whatsapp_number || '',
                        storeAddress: store?.address && store?.city && store?.state
                          ? `${store.address} - ${store.city}/${store.state}`
                          : (store?.address || store?.city || store?.state || ''),
                      });
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-[#f5f1e8] transition hover:bg-white/5"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Imprimir
                </button>

                {!isCancelled && !isCompleted && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Cancelar pedido
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8f7e] dark:text-[#8b816f]">
                Leitura rápida
              </p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#746b5f] dark:text-[#9d9385]">Status</span>
                  <span className="text-sm font-semibold">{STATUS_LABELS[order.status.toLowerCase()] || order.status}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#746b5f] dark:text-[#9d9385]">Itens</span>
                  <span className="text-sm font-semibold">{order.items?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#746b5f] dark:text-[#9d9385]">Total</span>
                  <span className="text-sm font-semibold">{formatMoney(order.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#746b5f] dark:text-[#9d9385]">Criado</span>
                  <span className="text-sm font-semibold">{format(order.created_at ? new Date(order.created_at) : new Date(), 'HH:mm')}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Pedido"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-zinc-400">
            Tem certeza que deseja cancelar o pedido <strong>#{order.order_number}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
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
    </div>
  );
};

export default OrderDetailPage;
