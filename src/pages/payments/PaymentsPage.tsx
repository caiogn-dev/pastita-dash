/**
 * Payments Page - Shows payment information from store orders
 * Uses the unified stores API to fetch orders with payment data
 */
import { copyToClipboard } from '../../utils/clipboard';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
  LinkIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Table, Pagination, PageLoading } from '../../components/common';
import {
  Button,
  Card,
  EmptyState,
  KpiGrid,
  PageShell,
  PeriodChips,
  SeloDeEstado,
  estadoDePagamento,
} from '../../components/ui';
import { ordersService } from '../../services';
import { Order } from '../../types';
import logger from '../../services/logger';
import { useStore } from '../../hooks';
import { useOrderStats } from '../../hooks/queries/useOrderStats';
import { usePaymentsOrders } from '../../hooks/queries/usePaymentsOrders';
import { buildStorefrontUrl } from '../../utils/storefrontUrl';
import { formatCurrency } from '../../utils/formatters';

// DRF default page size (apps/stores/api/views/order_views.py / settings PAGE_SIZE)
const PAGE_SIZE = 20;

// Situações de pagamento do StoreOrder.PaymentStatus. O rótulo vem do mapa
// único (`estadoDePagamento`): o mesmo "Pago" do quadro de pedidos, na mesma cor.
const PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'];

// Payment method display names
const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX', icon: <QrCodeIcon className="w-4 h-4" /> },
  credit_card: { label: 'Crédito', icon: <CreditCardIcon className="w-4 h-4" /> },
  debit_card: { label: 'Débito', icon: <CreditCardIcon className="w-4 h-4" /> },
  cash: { label: 'Dinheiro', icon: <BanknotesIcon className="w-4 h-4" /> },
  card: { label: 'Cartão', icon: <CreditCardIcon className="w-4 h-4" /> },
  mercadopago: { label: 'Mercado Pago', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
};

export const PaymentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId, stores } = useStore();
  const selectedStore = useMemo(() => {
    if (!routeStoreId && !storeId) return null;
    return stores.find((store) =>
      store.id === routeStoreId ||
      store.slug === routeStoreId ||
      store.id === storeId
    ) || null;
  }, [routeStoreId, storeId, stores]);
  const effectiveStoreId = useMemo(() => {
    if (!routeStoreId) return storeId || null;
    return selectedStore?.id || routeStoreId;
  }, [routeStoreId, selectedStore, storeId]);
  const storefrontUrl = useMemo(() => buildStorefrontUrl(selectedStore), [selectedStore]);

  // Lista paginada + filtro por payment_status server-side (count/results do backend).
  const ordersQuery = usePaymentsOrders(effectiveStoreId, page, statusFilter);
  const orders = ordersQuery.data?.results ?? [];
  const totalCount = ordersQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // KPIs agregados pelo backend (/orders/stats/) — não computados de um array baixado.
  const statsQuery = useOrderStats(effectiveStoreId);
  const orderStats = statsQuery.data;

  const isLoading = ordersQuery.isLoading || statsQuery.isLoading;

  // Tratamento de erro por SEÇÃO. Sem isto, uma falha de API deixava
  // `isLoading` false e a página renderizava zeros ("R$ 0,00 recebido",
  // "Nenhum pagamento encontrado") — enganando o lojista a achar que perdeu
  // o faturamento.
  //
  // Cada query alimenta uma seção independente (stats → KPIs; orders → tabela),
  // então avaliamos a falha de cada uma isoladamente: uma query que falhou SEM
  // dado em cache não pode cair no default zero/vazio da outra seção.
  const statsFailed = statsQuery.isError && statsQuery.data === undefined;
  const ordersFailed = ordersQuery.isError && ordersQuery.data === undefined;
  const hasError = ordersQuery.isError || statsQuery.isError;
  // Falha de atualização mas com dados em cache nas duas seções (keepPreviousData):
  // mostramos o cache com um aviso não-bloqueante, sem bloquear a página.
  const staleWarning = hasError && !statsFailed && !ordersFailed;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['orders', 'payments'] });
    queryClient.invalidateQueries({ queryKey: ['order-stats'] });
  };

  const retry = () => {
    ordersQuery.refetch();
    statsQuery.refetch();
  };

  // Handle confirm payment (mark as paid)
  const handleConfirmPayment = async (order: Order) => {
    try {
      await ordersService.markPaid(order.id);
      toast.success(`Pagamento do pedido #${order.order_number} confirmado!`);
      refresh();
    } catch (error) {
      logger.error('Error confirming payment:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  const changeStatusFilter = (value: string | null) => {
    setStatusFilter(value);
    setPage(1);
  };

  // KPIs derivados do endpoint de stats agregadas (/orders/stats/).
  // revenue.* soma apenas pedidos com payment_status='paid'; revenue.pending soma os 'pending'.
  // by_payment_status traz a contagem EXATA por payment_status (paid/pending).
  const stats = useMemo(() => {
    return {
      totalRevenue: Number(orderStats?.revenue?.total ?? 0),
      todayRevenue: Number(orderStats?.revenue?.today ?? 0),
      pendingRevenue: Number(orderStats?.revenue?.pending ?? 0),
      todayCount: orderStats?.today ?? 0,
      total: orderStats?.total ?? 0,
      paidCount: Number(orderStats?.by_payment_status?.paid ?? 0),
      pendingCount: Number(orderStats?.by_payment_status?.pending ?? 0),
    };
  }, [orderStats]);

  // Filter options. Contagens por payment_status não vêm do stats agregado,
  // então não exibimos badges de contagem nos filtros (eram derivadas dos 500).
  // 'todos' entra como opção em vez de um botão à parte: o `StatusFilter`
  // desenhava o "Todos" por fora com `value === null`, e era a única razão
  // para aquele componente existir ao lado do chip canônico do painel.
  const filterOptions = useMemo(
    () => [
      { value: 'todos', label: 'Todos' },
      ...PAYMENT_STATUSES.map((value) => ({ value, label: estadoDePagamento(value).rotulo })),
    ],
    [],
  );

  // Table columns
  const columns = [
    {
      key: 'order_number',
      header: 'Pedido',
      render: (order: Order) => (
        <div>
          <span className="font-semibold text-fg-token">#{order.order_number}</span>
          <p className="text-xs text-fg-muted-token">{order.customer_name}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Valor',
      render: (order: Order) => (
        <span className="font-semibold tabular-nums text-fg-token">{formatCurrency(order.total)}</span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Método',
      render: (order: Order) => {
        const method = order.payment_method || 'pix';
        const methodInfo = PAYMENT_METHOD_LABELS[method] || { label: method, icon: <CurrencyDollarIcon className="w-4 h-4" /> };
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-fg-token">
            <span className="text-fg-muted-token" aria-hidden>{methodInfo.icon}</span>
            {methodInfo.label}
          </span>
        );
      },
    },
    {
      key: 'payment_status',
      header: 'Situação',
      render: (order: Order) => {
        const estado = estadoDePagamento(order.payment_status);
        return <SeloDeEstado tone={estado.tone} ponto>{estado.rotulo}</SeloDeEstado>;
      },
    },
    {
      key: 'payment_link',
      header: 'Link de pagamento',
      render: (order: Order) => {
        const { payment_method, pix_code, access_token, pix_ticket_url, payment_preference_id } = order;

        // Generate link from payment_preference_id if available (for card payments)
        const preferenceLink = payment_preference_id 
          ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${payment_preference_id}`
          : null;
        
        // SECURE: Generate link using access_token (not order_number)
        // This prevents unauthorized access to order details
        const clientPaymentLink = pix_code && access_token && storefrontUrl
            ? `${storefrontUrl}/pendente?token=${encodeURIComponent(access_token)}`
          : null;
        
        // Priority: pix_ticket_url > client payment page (with token) > preference link
        const finalPaymentLink = pix_ticket_url || clientPaymentLink || preferenceLink;
        
        // Show link if available
        if (finalPaymentLink) {
          return (
            <div className="flex items-center gap-2">
              <a
                href={finalPaymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded border border-border-token bg-surface px-2.5 text-sm font-medium text-fg-token transition-colors hover:bg-surface-2"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="w-4 h-4 text-fg-muted-token" aria-hidden />
                Abrir
              </a>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await copyToClipboard(finalPaymentLink);
                  if (ok) toast.success('Link copiado! Envie para o cliente.');
                  else toast.error('Não foi possível copiar. Copie manualmente.');
                }}
                className="rounded p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token"
                title="Copiar link"
                aria-label="Copiar link de pagamento"
              >
                <ClipboardIcon className="w-4 h-4" aria-hidden />
              </button>
            </div>
          );
        }
        
        // If payment method is cash, no link needed
        if (payment_method === 'cash') {
          return <span className="text-sm text-fg-muted-token">Dinheiro</span>;
        }
        
        // No payment info yet
        return <span className="text-sm text-fg-muted-token">-</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (order: Order) => (
        <div className="text-sm">
          <p className="text-fg-token">{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p className="text-fg-muted-token">{format(new Date(order.created_at), "HH:mm", { locale: ptBR })}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (order: Order) => (
        // Pago não repete "Pago" aqui: a coluna Situação já diz, com a cor.
        <div className="flex items-center gap-2">
          {order.payment_status === 'pending' && (
            <Button
              size="sm"
              leftIcon={<CheckCircleIcon className="w-4 h-4" aria-hidden />}
              onClick={(e) => {
                e?.stopPropagation();
                handleConfirmPayment(order);
              }}
            >
              Confirmar pagamento
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  // Falha total (as duas seções sem nenhum dado em cache): não renderiza zeros
  // enganosos — mostra um estado de erro acionável com "Tentar novamente".
  if (statsFailed && ordersFailed) {
    return (
      <PageShell trilha={[{ rotulo: 'PDV' }, { rotulo: 'Pagamentos' }]} titulo="Pagamentos">
        <Card>
          <EmptyState
            icone={<ExclamationTriangleIcon className="w-8 h-8" aria-hidden />}
            titulo="Erro ao carregar pagamentos"
            descricao="Não foi possível carregar os dados de pagamento. Verifique sua conexão e tente novamente."
            acao={<Button onClick={retry}>Tentar novamente</Button>}
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'PDV' }, { rotulo: 'Pagamentos' }]}
      titulo="Pagamentos"
      // A descrição depende do stats agregado; se ele falhou sem cache, não
      // exibimos o "R$ 0,00 recebido" enganoso — ausência é melhor que zero
      // falso quando o número é dinheiro.
      descricao={
        statsFailed
          ? 'Acompanhe o que foi cobrado, o que entrou e o que ficou pendente.'
          : `${stats.total} pedido(s) · ${formatCurrency(stats.totalRevenue)} recebido`
      }
    >

      {/* Falha de atualização com dados em cache: aviso não-bloqueante para o
          lojista saber que os números podem não refletir o estado mais recente. */}
      {staleWarning && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-token/30 bg-warning-soft p-4"
        >
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-warning-token" aria-hidden />
          <span className="flex-1 text-sm text-fg-token">
            Alguns dados podem estar desatualizados — houve uma falha ao atualizar.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            leftIcon={<ArrowPathIcon className="w-4 h-4" aria-hidden />}
          >
            Tentar novamente
          </Button>
        </div>
      )}

        {/* Stats Cards — erro isolado da seção quando o stats falhou sem cache. */}
        {statsFailed ? (
          <Card>
            <EmptyState
              icone={<ExclamationTriangleIcon className="w-8 h-8" aria-hidden />}
              titulo="Não foi possível carregar os indicadores"
              descricao="Os valores de faturamento não puderam ser carregados. Tente novamente."
              acao={<Button onClick={retry}>Tentar novamente</Button>}
            />
          </Card>
        ) : (
        <KpiGrid
          itens={[
            {
              label: 'Receita de hoje',
              value: formatCurrency(stats.todayRevenue),
              definicao: `Soma dos pedidos pagos hoje · ${stats.todayCount} pedido(s) no dia`,
            },
            {
              label: 'Total recebido',
              value: formatCurrency(stats.totalRevenue),
              definicao: `${stats.paidCount} pedido(s) pago(s), desde o início`,
            },
            {
              label: 'Pendentes',
              value: stats.pendingCount,
              definicao: `${formatCurrency(stats.pendingRevenue)} a receber`,
            },
            {
              label: 'Pedidos',
              value: stats.total,
              definicao: 'Todos os pedidos da loja, desde o início',
            },
          ]}
        />
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PeriodChips
            ariaLabel="Filtrar por situação do pagamento"
            options={filterOptions}
            value={statusFilter ?? 'todos'}
            onChange={(v) => changeStatusFilter(v === 'todos' ? null : v)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            leftIcon={<ArrowPathIcon className="w-4 h-4" aria-hidden />}
          >
            Atualizar
          </Button>
        </div>

        {/* Payments Table — erro isolado quando a lista de pedidos falhou sem
            cache: mostra erro em vez do enganoso "Nenhum pagamento encontrado". */}
        {ordersFailed ? (
          <Card>
            <EmptyState
              icone={<ExclamationTriangleIcon className="w-8 h-8" aria-hidden />}
              titulo="Não foi possível carregar os pedidos"
              descricao="A lista de pagamentos não pôde ser carregada. Tente novamente."
              acao={<Button onClick={retry}>Tentar novamente</Button>}
            />
          </Card>
        ) : (
        <Card noPadding>
          <Table
            columns={columns}
            data={orders}
            keyExtractor={(order) => order.id}
            emptyMessage="Nenhum pagamento encontrado"
          />
          {totalCount > PAGE_SIZE && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalCount}
              itemsPerPage={PAGE_SIZE}
            />
          )}
        </Card>
        )}
    </PageShell>
  );
};

export default PaymentsPage;
