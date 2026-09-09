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
import { copyToClipboard } from '../../utils/clipboard';
import React, { Fragment, useEffect, useState, useMemo, useRef } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
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
  LinkIcon,
  InboxArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  FireIcon,
  CheckBadgeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  BuildingStorefrontIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, Modal, PageLoading } from '../../components/common';
import { OrderDeliveryModal } from '../../components/OrderDeliveryModal';
import { ordersService, paymentsService, getErrorMessage } from '../../services';
import NotaFiscalPedido from './NotaFiscalPedido';
import { Order, Payment, OrderComboItem, ComboSelectedItem } from '../../types';

// Linhas de seleção de combo (ex.: "Escolha sua salada: 1x Tilápia Suprema")
// a partir do snapshot salvo no pedido (display_data.groups ou selected_variants_data).
const comboSelectionLines = (combo: OrderComboItem | undefined): string[] => {
  if (!combo) return [];
  const fromGroups = (combo.display_data?.groups || []).flatMap((g) =>
    (g.items || []).map((it: ComboSelectedItem) => {
      const name = it.variant_name || it.product_name || '';
      if (!name) return '';
      const qty = it.quantity && it.quantity > 1 ? `${it.quantity}x ` : '';
      return g.group_name ? `${g.group_name} ${qty}${name}` : `${qty}${name}`;
    }).filter(Boolean)
  );
  if (fromGroups.length) return fromGroups;
  return (combo.selected_variants_data || [])
    .map((it) => {
      const name = it.variant_name || it.product_name || '';
      if (!name) return '';
      const qty = it.quantity && it.quantity > 1 ? `${it.quantity}x ` : '';
      return it.group_name ? `${it.group_name} ${qty}${name}` : `${qty}${name}`;
    })
    .filter(Boolean);
};

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
import { marcosDoPedido, duracaoLegivel } from './marcosDoPedido';
import { proximaAcaoDoPedido } from './proximaAcao';
import { etapasDoPedido, horariosDasEtapas, type EtapaDoPedido } from './fluxoDoPedido';
import { enderecoDaEntrega } from './enderecoDaEntrega';
// Os rótulos moram num arquivo só, com teste que confere contra a lista de
// status do backend: era esta duplicação que deixava "cancelled" cru na tela.
import {
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
} from '../../utils/rotulosDeEstado';
import { formatCurrency, formatPhone, formatPhoneForWhatsApp } from '../../utils/formatters';

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

/**
 * De onde o pedido veio.
 *
 * O `source` existia no backend com cinco valores e aparecia só no Histórico:
 * quem abria um pedido não sabia se ele veio do site, do balcão ou do bot — e
 * é a primeira coisa que se pergunta quando o cliente reclama.
 */
const CANAL_DO_PEDIDO: Record<string, string> = {
  web: 'Site',
  pdv: 'Balcão',
  whatsapp: 'WhatsApp',
  payment_link: 'Link de pagamento',
  carteira: 'Carteira',
  dashboard: 'Painel',
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


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

/**
 * A régua de status, atravessando o topo do pedido.
 *
 * É a primeira pergunta de quem abre um pedido — "onde ele está?" — então ela
 * ocupa a largura inteira, antes de qualquer outra coisa. As etapas vêm de
 * `fluxoDoPedido`, que ramifica entrega e retirada igual ao botão de ação.
 */
const ICONE_DA_ETAPA: Record<EtapaDoPedido['chave'], typeof ClockIcon> = {
  recebido: InboxArrowDownIcon,
  confirmado: CheckCircleIcon,
  preparo: FireIcon,
  despacho: TruckIcon,
  fim: CheckBadgeIcon,
};

interface FluxoDoStatusProps {
  order: Order;
  isCancelled?: boolean;
  /** Horários reais do pedido, para pendurar em cada etapa. */
  marcos?: Array<{ chave: string; quando: Date; minutosDesdeAnterior: number | null }>;
}

const FluxoDoStatus: React.FC<FluxoDoStatusProps> = ({ order, isCancelled, marcos = [] }) => {
  const etapas = etapasDoPedido(order);
  const horarios = horariosDasEtapas(marcos);
  const retirada = order.delivery_method === 'pickup' || order.delivery_method === 'digital';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[var(--danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)]">
        <XCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        Pedido cancelado
      </div>
    );
  }

  return (
    <ol className="flex items-start" aria-label="Andamento do pedido">
      {etapas.map((etapa, i) => {
        const Icone = etapa.chave === 'despacho' && retirada ? ShoppingBagIcon : ICONE_DA_ETAPA[etapa.chave];
        const concluida = etapa.estado === 'concluida';
        const atual = etapa.estado === 'atual';
        const quando = horarios[etapa.chave];
        const anterior = i > 0 ? etapas[i - 1] : null;

        return (
          <Fragment key={etapa.chave}>
            {/* O trecho de linha ENTRE duas bolinhas é o tempo que se passou
                entre elas — é onde a duração pertence. */}
            {anterior && (
              <li aria-hidden="true" className="flex flex-1 flex-col items-center pt-4">
                <span
                  className={`h-0.5 w-full rounded-full ${
                    concluida || atual ? 'bg-[var(--brand)]' : 'bg-border-token'
                  }`}
                />
                {quando?.minutos != null && (
                  <span className="mt-1 text-badge text-fg-muted-token">
                    {duracaoLegivel(quando.minutos)}
                  </span>
                )}
              </li>
            )}

            <li
              className="flex shrink-0 flex-col items-center gap-1.5 px-1 text-center"
              aria-current={atual ? 'step' : undefined}
            >
              <span
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                  concluida
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-brand-strong'
                    : atual
                      ? 'border-[var(--brand)] bg-surface text-[var(--brand)] ring-4 ring-brand-soft'
                      : 'border-border-token bg-surface text-fg-muted-token',
                ].join(' ')}
              >
                {concluida ? <CheckIcon className="h-4 w-4" /> : <Icone className="h-4 w-4" />}
              </span>
              <span
                className={[
                  'text-xs leading-tight',
                  atual ? 'font-semibold text-fg-token' : concluida ? 'text-fg-token' : 'text-fg-muted-token',
                ].join(' ')}
              >
                {etapa.rotulo}
              </span>
              {/* A hora vive na etapa: o cartão "Tempos" que a guardava
                  esticava a coluna lateral e abria um buraco ao lado dos
                  itens. Aqui ela responde "onde" e "quando" de uma vez. */}
              <span className="text-badge tabular-nums text-fg-muted-token">
                {quando?.hora ?? '\u00A0'}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
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
    { pix_code?: string; pix_qr_code?: string; ticket_url?: string; via_link?: boolean } | null
  >(null);

  // Imprime o pedido. hidePrices=true gera a comanda da cozinha (sem
  // valores/pagamento); preparo=true gera a via de montagem, com o rendimento
  // e a composição de cada item vindos do catálogo.
  const handlePrint = async (hidePrices = false, preparo = false) => {
    if (!order) return;
    const printOpts = (target: Order | null | undefined) => ({
      storeName: store?.name || target?.store_name || order.store_name || 'Loja',
      storePhone: store?.phone || store?.whatsapp_number || '',
      storeAddress: store?.address && store?.city && store?.state
        ? `${store.address} - ${store.city}/${store.state}`
        : (store?.address || store?.city || store?.state || ''),
      // O painel roda em https: logo servida em http é bloqueada como
      // mixed-content e a comanda sai sem selo, em silêncio.
      storeLogo: (store?.logo_url || store?.logo || '').replace(/^http:\/\//, 'https://'),
      hidePrices,
      preparo,
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
      // Quando o MP recusa o PIX, o backend segue por Checkout Pro e devolve
      // `payment_url`/`init_point` — nunca `ticket_url`. Lendo só as chaves do
      // PIX, a caixa saía VAZIA e o operador ficava com um "Aguardando" na
      // lista de cobranças e nenhum link para mandar ao cliente.
      const viaLink = Boolean(payment.pix_fallback) || payment.payment_method === 'link';
      setGeneratedPix({
        pix_code: (payment.pix_code as string) || undefined,
        pix_qr_code: (payment.pix_qr_code as string) || undefined,
        ticket_url:
          (payment.ticket_url as string)
          || (payment.pix_ticket_url as string)
          || (payment.payment_url as string)
          || (payment.init_point as string)
          || undefined,
        via_link: viaLink,
      });
      const fresh = await paymentsService.getByOrder(order.id).catch(() => payments);
      setPayments(fresh);
      toast.success(viaLink ? 'Cobrança gerada por link de pagamento.' : 'Cobrança PIX gerada!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGeneratingCharge(false);
    }
  };

  const handleCopyPix = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) toast.success('Código PIX copiado!');
    else toast.error('Não foi possível copiar. Copie manualmente.');
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

  // Qual id está sendo carregado agora — respostas de ids antigos são descartadas.
  const idEmVooRef = useRef<string | null>(null);

  const loadOrder = async () => {
    if (!id) return;
    // Vale a última PEDIDA, não a última a responder. O modal tem navegação
    // "anterior/próximo" que troca o `id` na querystring; dois cliques rápidos
    // deixavam duas requisições em voo e a mais lenta sobrescrevia a mais nova.
    // O contador ("5 de 12") e a URL vêm do searchParams, então a tela mostrava
    // o pedido 5 no cabeçalho e os dados do 4 no corpo — e "Marcar entregue"
    // agia sobre `order.id`, ou seja, o pedido ERRADO.
    const idDestaCarga = id;
    idEmVooRef.current = idDestaCarga;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [orderData, paymentsData] = await Promise.all([
        ordersService.getOrder(idDestaCarga),
        paymentsService.getByOrder(idDestaCarga).catch(() => []),
      ]);
      if (idEmVooRef.current !== idDestaCarga) return; // chegou tarde: descarta
      setOrder(orderData);
      setPayments(paymentsData);
      onOrderChanged?.(orderData);
    } catch (error) {
      if (idEmVooRef.current !== idDestaCarga) return;
      // Antes fazia onClose() → em erro transitório o usuário era ejetado da
      // tela (e na variante page, navegava pra lista). Agora mostra retry.
      setLoadError(getErrorMessage(error));
    } finally {
      if (idEmVooRef.current === idDestaCarga) setIsLoading(false);
    }
  };

  const [recalculandoFidelidade, setRecalculandoFidelidade] = useState(false);

  /**
   * Acerta os selos de um pedido já entregue. Necessário porque o crédito é
   * uma fotografia tirada na entrega: mudar os "selos por unidade" de um
   * produto depois da venda não retroage nos pedidos antigos.
   */
  const handleRecalcularFidelidade = async () => {
    if (!order || recalculandoFidelidade) return;
    setRecalculandoFidelidade(true);
    try {
      const r = await ordersService.recalcularFidelidade(order.id);
      if (r.reason === 'sem_cliente') {
        toast('Pedido sem cliente cadastrado — não há conta de fidelidade.');
      } else if (r.reason === 'fidelidade_desligada') {
        toast('A fidelidade está desligada nesta loja.');
      } else if (!r.changed) {
        toast.success(`Já estava certo: ${r.after} selo(s).`);
      } else {
        toast.success(
          `Fidelidade ajustada: ${r.before} → ${r.after} selo(s) (${r.delta > 0 ? '+' : ''}${r.delta}).`,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRecalculandoFidelidade(false);
    }
  };

  /**
   * Recebe o STATUS final, não um apelido de ação.
   *
   * Antes havia um dicionário de apelidos ('deliver' → out_for_delivery) que
   * duplicava a máquina de estados e escondia qual status ia de fato ser
   * gravado. O passo agora vem pronto de `proximaAcao.ts`.
   */
  const handleAction = async (novoStatus: string) => {
    if (!order) return;
    setActionLoading(novoStatus);
    try {
      const updated: Order = await ordersService.updateStatus(order.id, novoStatus);
      if (novoStatus === 'cancelled') setShowCancelModal(false);
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
  // Antes de qualquer `return` condicional: hook depois de early return muda
  // a quantidade de hooks entre renders e o React derruba a árvore.
  const marcos = useMemo(() => (order ? marcosDoPedido(order as never) : []), [order]);

  /**
   * O passo seguinte vem de `proximaAcao.ts`, a mesma função do kanban.
   *
   * Esta tela tinha a PRÓPRIA tabela de status e ela ignorava o
   * `delivery_method`: mandava todo pedido por "Marcar como Pronto" antes de
   * "Saiu para Entrega". Como cada status dispara uma mensagem, a cliente de
   * uma entrega recebia "pronto para retirada" e, segundos depois, "está a
   * caminho" (CE-2608129257, 12/ago). Uma cópia da regra a menos.
   *
   * Um único CTA de marca (ouro sobre carvão) — a etiqueta já diz o passo;
   * cor por status virava um arco-íris fora da paleta do painel.
   */
  const nextAction = useMemo(() => {
    if (!order) return null;
    const acao = proximaAcaoDoPedido(order);
    return acao ? { action: acao.status, label: acao.rotulo } : null;
  }, [order]);

  const isCancelled = order?.status.toLowerCase() === 'cancelled';
  const isCompleted = ['delivered', 'completed'].includes(order?.status.toLowerCase() || '');

  if (isLoading) {
    return <PageLoading />;
  }

  if (loadError && !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border-token bg-surface px-6 py-12 text-center">
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
  const paymentStatus = order.payment_status || 'pending';
  const paymentStatusLabel = PAYMENT_STATUS_LABELS;
  const paymentMethodLabel = PAYMENT_METHOD_LABELS;

  const paymentLink = order.pix_ticket_url || order.payment_url || order.payment_link || order.init_point || null;
  const hasPaymentBalance = order.amount_due !== undefined && order.amount_due !== null;
  const amountDue = Number(order.amount_due ?? 0);
  const isFullyPaid = order.is_fully_paid === true || (hasPaymentBalance && amountDue <= 0);
  const customerInitials = getInitials(order.customer_name);
  const manualSurcharge =
    Number(order.surcharge_value ?? order.metadata?.manual_surcharge ?? 0) || 0;
  // O saldo gasto vive no metadata do pedido desde que o cashback existe —
  // é o `discount` que o soma junto com o cupom.
  const cashbackUsado = Number(order.metadata?.cashback_aplicado ?? 0) || 0;
  const adjustmentReason =
    order.surcharge_reason?.trim() ||
    order.manual_discount_reason?.trim() ||
    getAdjustmentReason(order.metadata);

  const entrega = enderecoDaEntrega(
    parseAddress(order.delivery_address || order.shipping_address),
  );
  const ehRetirada = order.delivery_method === 'pickup';
  const ehDigital = order.delivery_method === 'digital';
  const telefone = order.customer_phone || '';
  const zap = formatPhoneForWhatsApp(telefone);
  const canal = CANAL_DO_PEDIDO[order.source || ''] ?? null;
  // Cobranças que não viraram dinheiro ficam recolhidas: um pedido pago com 3
  // tentativas canceladas mostrava 4 linhas de mesmo valor e mesmo peso, e a
  // que importa é a que entrou.
  const cobrancasVivas = payments.filter((p) => p.status !== 'cancelled' && p.status !== 'failed');
  const cobrancasMortas = payments.filter((p) => p.status === 'cancelled' || p.status === 'failed');

  /** Um rótulo de seção: peso de texto, não faixa dourada em caixa alta. */
  const Secao: React.FC<{ children: React.ReactNode; acao?: React.ReactNode }> = ({ children, acao }) => (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-fg-token">{children}</h2>
      {acao}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* ── Cabeçalho: número, quem, estado e valor ───────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onClose}
              aria-label={variant === 'modal' ? 'Fechar' : 'Voltar'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-token text-fg-muted-token transition hover:bg-surface-2 hover:text-fg-token"
            >
              {variant === 'modal' ? <XMarkIcon className="h-5 w-5" /> : <ArrowLeftIcon className="h-5 w-5" />}
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-semibold text-[var(--brand)]">
              {customerInitials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-fg-token">
                {order.customer_name || 'Cliente sem nome'}
              </h1>
              <p className="truncate text-xs text-fg-muted-token">
                <span className="font-mono">#{order.order_number}</span>
                {' · '}{formatOrderCreatedAt(order.created_at)}
                {canal ? <>{' · '}{canal}</> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusColors}`}>
              {STATUS_LABELS[order.status.toLowerCase()] || order.status}
            </span>
            <span className="text-xl font-semibold tracking-[-0.03em] text-fg-token">
              {formatCurrency(order.total)}
            </span>
          </div>
        </header>

        {/* ── A régua de status, atravessando o topo ────────────────────── */}
        <div className="rounded-xl border border-border-token bg-surface px-5 py-4">
          <FluxoDoStatus order={order} isCancelled={isCancelled} marcos={marcos} />
        </div>

        {/* ── Cliente e entrega: uma faixa horizontal, largura inteira ─────
            Estas três coisas respondem UMA pergunta — para quem e para onde —
            e viviam em três lugares: telefone num cartão, "Delivery" em outro,
            e o endereço três blocos abaixo. */}
        {/* Duas colunas, não três. Os botões moravam numa coluna só deles e
            deixavam 110px de buraco embaixo: botão não é informação, ele
            pertence à coisa que opera. */}
        <section className="grid gap-x-8 gap-y-4 rounded-xl border border-border-token bg-surface p-5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-medium text-fg-muted-token">Cliente</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {telefone ? (
                <a href={`tel:${telefone}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-token hover:underline">
                  <PhoneIcon className="h-4 w-4 shrink-0 text-fg-muted-token" />
                  {formatPhone(telefone)}
                </a>
              ) : (
                <span className="text-sm text-fg-muted-token">Sem telefone</span>
              )}
              {zap && (
                <a
                  href={`https://wa.me/${zap}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-token px-2.5 py-1 text-xs font-semibold text-fg-token transition hover:bg-surface-2"
                >
                  <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
            {typeof order.pedidos_do_cliente === 'number' && order.pedidos_do_cliente > 0 ? (
              <p className="mt-1 text-xs text-fg-muted-token">
                {order.pedidos_do_cliente === 1 ? 'Primeiro pedido' : `${order.pedidos_do_cliente}º pedido na loja`}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleToggleNotifications}
              disabled={togglingNotifications}
              aria-pressed={notificationsSuppressed}
              title={notificationsSuppressed
                ? 'As mensagens automáticas de status estão silenciadas para este pedido. Clique para reativar.'
                : 'Silenciar as mensagens automáticas de WhatsApp deste pedido (ex.: pedido de balcão).'}
              className={`mt-2 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                notificationsSuppressed
                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                  : 'text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {notificationsSuppressed
                ? <><BellSlashIcon className="h-3.5 w-3.5" />Avisos silenciados</>
                : <><BellIcon className="h-3.5 w-3.5" />Avisando a cada etapa</>}
            </button>
          </div>

          <div className="min-w-0 sm:border-l sm:border-border-token sm:pl-6">
            <p className="mb-1.5 text-xs font-medium text-fg-muted-token">
              {ehRetirada ? 'Retirada' : ehDigital ? 'Cobrança' : 'Entrega'}
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-fg-token">
              {ehRetirada ? <HomeIcon className="h-4 w-4 shrink-0 text-fg-muted-token" />
                : ehDigital ? <LinkIcon className="h-4 w-4 shrink-0 text-fg-muted-token" />
                : <TruckIcon className="h-4 w-4 shrink-0 text-fg-muted-token" />}
              {ehRetirada ? 'Retirada no balcão'
                : ehDigital ? 'Link de pagamento'
                : entrega.bairro || 'Entrega'}
            </p>
            {/* O endereço fica JUNTO de quem recebe — e com o complemento, que
                é o que faz a entrega chegar. */}
            {!ehRetirada && !ehDigital && !entrega.vazio && (
              <div className="mt-1 space-y-0.5 text-sm leading-snug text-fg-muted-token">
                {entrega.linhas.map((linha) => <p key={linha}>{linha}</p>)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {formatScheduledLabel(order) && (
                <span className="inline-flex items-center gap-1.5 rounded bg-brand-soft px-2 py-1 text-xs font-semibold text-[var(--brand)]">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Agendado: {formatScheduledLabel(order)}
                </span>
              )}
              {!ehRetirada && !ehDigital && entrega.mapa && (
                <a
                  href={entrega.mapa}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-token px-2.5 py-1 text-xs font-semibold text-fg-token transition hover:bg-surface-2"
                >
                  <MapPinIcon className="h-3.5 w-3.5" />
                  Ver no mapa
                </a>
              )}
            </div>
          </div>

        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* ── Observações: acima dos itens, é instrução de cozinha ── */}
            {(order.customer_notes || order.notes) && (
              <div className="flex gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-fg-token">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                <p className="leading-relaxed">{order.customer_notes || order.notes}</p>
              </div>
            )}

            {/* ── O que foi pedido ──────────────────────────────────── */}
            <section className="rounded-xl border border-border-token bg-surface p-5">
              <Secao
                acao={
                  <span className="text-xs text-fg-muted-token">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                  </span>
                }
              >
                Itens
              </Secao>

              <ul className="divide-y divide-border-token">
                {order.items?.map((item, index) => {
                  const isSalad = !!(item.options?.is_salad_builder);
                  const combo = order.combo_items?.find((c) => c.order_item === item.id);
                  const selectionLines = comboSelectionLines(combo);
                  return (
                    <li key={item.id || index} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="mt-0.5 shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-semibold text-fg-token">
                        {item.quantity}×
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg-token">
                          {item.product_name}
                          {item.variant_name ? ` — ${item.variant_name}` : ''}
                          {isSalad && (
                            <span className="ml-2 rounded-full bg-[var(--success-soft)] px-1.5 py-0.5 text-badge font-semibold text-[var(--success)]">
                              Salada
                            </span>
                          )}
                        </p>
                        {selectionLines.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5" data-testid="combo-selections">
                            {selectionLines.map((line, i) => (
                              <li key={i} className="text-xs text-fg-muted-token">{line}</li>
                            ))}
                          </ul>
                        )}
                        {item.notes && (
                          <p className="mt-0.5 text-xs italic text-fg-muted-token">{item.notes}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-fg-token">{formatCurrency(item.subtotal)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-fg-muted-token">{formatCurrency(item.unit_price)} cada</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-4 space-y-1.5 border-t border-border-token pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted-token">Subtotal</dt>
                  <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted-token">Entrega</dt>
                  <dd>{formatCurrency(order.delivery_fee || order.shipping_cost)}</dd>
                </div>
                {/* De ONDE veio o abatimento: cupom e saldo gasto ficavam
                    somados num "Desconto" só, e quem abria o pedido não tinha
                    como saber por que o valor era aquele. */}
                {cashbackUsado > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted-token">Cashback usado</dt>
                    <dd className="text-[var(--success)]">-{formatCurrency(cashbackUsado)}</dd>
                  </div>
                ) : null}
                {order.coupon_code?.trim() ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted-token">Cupom</dt>
                    <dd className="font-mono text-xs">{order.coupon_code.trim()}</dd>
                  </div>
                ) : null}
                {order.discount ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted-token">
                      {cashbackUsado > 0 ? 'Desconto total' : 'Desconto'}
                    </dt>
                    <dd className="text-[var(--success)]">-{formatCurrency(order.discount)}</dd>
                  </div>
                ) : null}
                {manualSurcharge > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted-token">Acréscimo</dt>
                    <dd>{formatCurrency(manualSurcharge)}</dd>
                  </div>
                ) : null}
                {adjustmentReason ? (
                  <p className="text-xs italic text-fg-muted-token">{adjustmentReason}</p>
                ) : null}
                <div className="flex justify-between gap-3 border-t border-border-token pt-2.5 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tracking-[-0.02em]">{formatCurrency(order.total)}</dd>
                </div>
              </dl>
            </section>
          </div>

          {/* ══ Coluna de apoio: dinheiro, nota, tempos ════════════════ */}
          <aside className="flex min-w-0 flex-col gap-5">

            {/* ── Dinheiro ─────────────────────────────────────────── */}
            <section className="rounded-xl border border-border-token bg-surface p-5">
              <Secao>Pagamento</Secao>

              {hasPaymentBalance && amountDue > 0 ? (
                <div className="flex items-baseline justify-between gap-3 rounded-lg bg-[var(--warning-soft)] px-3 py-2.5">
                  <span className="text-sm font-semibold text-[var(--warning)]">Falta receber</span>
                  <span className="text-lg font-semibold text-[var(--warning)]">{formatCurrency(amountDue)}</span>
                </div>
              ) : isFullyPaid ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--success)]">
                  <CheckCircleIcon className="h-5 w-5 shrink-0" />
                  Pago
                </div>
              ) : (
                <div className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  paymentStatus === 'failed' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                }`}>
                  {paymentStatusLabel[paymentStatus] || paymentStatus}
                </div>
              )}

              <p className="mt-2 text-sm text-fg-muted-token">
                {paymentMethodLabel[order.payment_method || ''] || order.payment_method || 'Forma não informada'}
              </p>

              {/* PIX gravado no pedido: era texto de 200 caracteres para
                  selecionar na mão, em 117 dos 172 pedidos da loja. */}
              {order.pix_code && (
                <div className="mt-3 flex items-center gap-2">
                  {/* O código fica visível, truncado: se o navegador negar a
                      área de transferência, o aviso manda copiar à mão — e
                      sem o texto na tela não haveria o que copiar. */}
                  <code
                    title={order.pix_code}
                    className="min-w-0 flex-1 truncate rounded border border-dashed border-border-token px-2 py-1.5 text-badge text-fg-muted-token"
                  >
                    {order.pix_code}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyPix(order.pix_code as string)}
                    aria-label="Copiar código PIX"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-token px-2.5 py-1.5 text-xs font-semibold text-fg-token transition hover:bg-surface-2"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    Copiar
                  </button>
                </div>
              )}

              {paymentLink && (
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-semibold text-fg-token transition hover:bg-surface-2"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Abrir link de pagamento
                </a>
              )}

              {/* Cobrar a diferença */}
              {amountDue > 0 && (
                <div className="mt-3 space-y-2 border-t border-border-token pt-3">
                  <label className="block text-xs text-fg-muted-token" htmlFor="valor-da-cobranca">
                    Valor da cobrança (R$)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="valor-da-cobranca"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      aria-label="Valor da cobrança"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      className="w-24 rounded-lg border border-border-token bg-surface px-2.5 py-2 text-sm outline-none focus:border-[var(--brand)]"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCharge}
                      disabled={generatingCharge}
                      className="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-brand-strong transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
                    >
                      {generatingCharge ? 'Gerando…' : 'Gerar cobrança PIX'}
                    </button>
                  </div>
                </div>
              )}

              {/* PIX recém-gerado */}
              {generatedPix && (
                <div className="mt-3 space-y-2 border-t border-border-token pt-3">
                  {generatedPix.via_link && (
                    <p className="text-xs text-fg-muted-token">
                      O Mercado Pago recusou o PIX. A cobrança seguiu por link — mande o link
                      abaixo para o cliente.
                    </p>
                  )}
                  {generatedPix.pix_code && (
                    <div className="flex items-center gap-2">
                      <code
                        title={generatedPix.pix_code}
                        className="min-w-0 flex-1 truncate rounded border border-dashed border-border-token px-2 py-1.5 text-badge text-fg-muted-token"
                      >
                        {generatedPix.pix_code}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyPix(generatedPix.pix_code!)}
                        aria-label="Copiar código PIX"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:bg-brand-soft"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Copiar
                      </button>
                    </div>
                  )}
                  {generatedPix.pix_qr_code && (
                    <img
                      src={generatedPix.pix_qr_code.startsWith('data:')
                        ? generatedPix.pix_qr_code
                        : `data:image/png;base64,${generatedPix.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="mx-auto h-32 w-32 rounded-lg border border-border-token"
                    />
                  )}
                  {generatedPix.ticket_url && (
                    <a
                      href={generatedPix.ticket_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-semibold transition hover:bg-surface-2"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Abrir link de pagamento
                    </a>
                  )}
                </div>
              )}

              {/* Cobranças: as que valeram em cima, as mortas recolhidas */}
              {cobrancasVivas.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-border-token pt-3 text-xs">
                  {cobrancasVivas.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-fg-muted-token">
                        {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                        {' · '}
                        {/* Vocabulário da COBRANÇA, não do pedido: aqui o
                            dinheiro fica `completed`, o pedido fica `paid`. */}
                        {PAYMENT_RECORD_STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {/* O link mora no StorePayment. Sem ele na linha, ao
                            reabrir o pedido sobrava "Aguardando" e nada para
                            mandar ao cliente. */}
                        {payment.payment_url && payment.status === 'pending' && (
                          <a
                            href={payment.payment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-border-token px-2 py-0.5 font-medium text-fg-token hover:bg-surface-2"
                          >
                            Abrir cobrança
                          </a>
                        )}
                        <span className="font-semibold text-fg-token">{formatCurrency(payment.amount)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {cobrancasMortas.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-fg-muted-token hover:text-fg-token">
                    {cobrancasMortas.length} tentativa{cobrancasMortas.length > 1 ? 's' : ''} sem sucesso
                  </summary>
                  <ul className="mt-1.5 space-y-1">
                    {cobrancasMortas.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-2 text-fg-muted-token">
                        <span className="min-w-0 truncate">
                          {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                          {' · '}
                          {PAYMENT_RECORD_STATUS_LABELS[payment.status] ?? payment.status}
                        </span>
                        <span className="shrink-0">{formatCurrency(payment.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>

          </aside>
        </div>

        {/* ── Barra de ações: secundárias à esquerda, a principal à direita ── */}
        {/* Fundo OPACO: com `bg-surface/95` os itens passavam por trás e a
            barra parecia flutuar no meio da lista. Ela é o chão da tela, não
            uma camada. O `-mb` come o gap do flex para encostar no fim. */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-token bg-surface px-4 py-3 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.6)] sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Três impressões numa fileira, não três botões de largura total:
                é uma escolha, não três decisões. */}
            <span className="inline-flex overflow-hidden rounded-lg border border-border-token">
              <button
                onClick={() => handlePrint(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Pedido
              </button>
              <button
                onClick={() => handlePrint(true)}
                title="Comanda sem preços, para a cozinha"
                className="border-l border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2"
              >
                Cozinha
              </button>
              <button
                onClick={() => handlePrint(true, true)}
                title="Via de montagem, com a composição de cada item"
                className="border-l border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2"
              >
                Preparo
              </button>
            </span>

            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2"
            >
              Editar
            </button>

            {/* Some sozinho em loja sem emissão configurada. */}
            <NotaFiscalPedido orderId={order.id} storeSlug={store?.slug || undefined} variant="barra" />

            {order.delivery_method === 'delivery' && !isCancelled && !isCompleted && (
              <button
                onClick={() => setShowUberModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2"
              >
                <TruckIcon className="h-4 w-4" />
                Uber Direct
              </button>
            )}

            {/* Sempre visível: pedido de convidado responde 'sem_cliente' e o
                toast explica — esconder daria a impressão de bug. */}
            <button
              onClick={handleRecalcularFidelidade}
              disabled={recalculandoFidelidade}
              title="Use depois de corrigir os selos de um produto: os pedidos antigos ficam com o valor da época."
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-token px-3 py-2 text-xs font-medium text-fg-token transition hover:bg-surface-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${recalculandoFidelidade ? 'animate-spin' : ''}`} />
              Fidelidade
            </button>

            {!isCancelled && !isCompleted && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
              >
                Cancelar pedido
              </button>
            )}
          </div>

          {nextAction && !isCancelled && !isCompleted ? (
            <button
              onClick={() => handleAction(nextAction.action)}
              disabled={!!actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-brand-strong transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === nextAction.action ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  {nextAction.label}
                </>
              )}
            </button>
          ) : (
            <span className="px-2 text-xs font-medium text-fg-muted-token">
              {isCancelled ? 'Pedido cancelado' : 'Pedido concluído'}
            </span>
          )}
        </div>
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
              onClick={() => handleAction('cancelled')}
              isLoading={actionLoading === 'cancelled'}
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
