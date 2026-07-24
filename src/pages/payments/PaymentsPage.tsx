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
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
  QrCodeIcon,
  LinkIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  Card,
  Button,
  Table,
  Pagination,
  PageLoading,
  StatusFilter,
  PageTitle,
  EmptyState,
} from '../../components/common';
import { ordersService } from '../../services';
import { Order } from '../../types';
import logger from '../../services/logger';
import { useStore } from '../../hooks';
import { useOrderStats } from '../../hooks/queries/useOrderStats';
import { usePaymentsOrders } from '../../hooks/queries/usePaymentsOrders';
import { buildStorefrontUrl } from '../../utils/storefrontUrl';

// DRF default page size (apps/stores/api/views/order_views.py / settings PAGE_SIZE)
const PAGE_SIZE = 20;

// Payment status options based on StoreOrder.PaymentStatus
const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Aguardando', color: 'warning' },
  { value: 'processing', label: 'Processando', color: 'purple' },
  { value: 'paid', label: 'Pago', color: 'success' },
  { value: 'failed', label: 'Falhou', color: 'danger' },
  { value: 'refunded', label: 'Reembolsado', color: 'gray' },
  { value: 'partially_refunded', label: 'Reembolso Parcial', color: 'orange' },
];

// Payment method display names
const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX', icon: <QrCodeIcon className="w-4 h-4" /> },
  credit_card: { label: 'Crédito', icon: <CreditCardIcon className="w-4 h-4" /> },
  debit_card: { label: 'Débito', icon: <CreditCardIcon className="w-4 h-4" /> },
  cash: { label: 'Dinheiro', icon: <BanknotesIcon className="w-4 h-4" /> },
  card: { label: 'Cartão', icon: <CreditCardIcon className="w-4 h-4" /> },
  mercadopago: { label: 'Mercado Pago', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
};

// Payment status badge component
const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-100 dark:bg-amber-900/40 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', icon: <ClockIcon className="w-4 h-4" /> },
    processing: { bg: 'bg-purple-100 dark:bg-purple-900/40 dark:bg-purple-900/40', text: 'text-purple-800 dark:text-purple-300', icon: <ArrowPathIcon className="w-4 h-4 animate-spin" /> },
    paid: { bg: 'bg-green-100 dark:bg-green-900/40 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', icon: <CheckCircleIcon className="w-4 h-4" /> },
    failed: { bg: 'bg-red-100 dark:bg-red-900/40 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', icon: <XCircleIcon className="w-4 h-4" /> },
    refunded: { bg: 'bg-gray-100 dark:bg-[var(--dark-bg-hover,#161616)] dark:bg-[var(--dark-bg-hover,#161616)]', text: 'text-gray-800 dark:text-gray-200 dark:text-[var(--dark-text-primary,#FAF9F7)]', icon: <ArrowPathIcon className="w-4 h-4" /> },
    partially_refunded: { bg: 'bg-orange-100 dark:bg-orange-900/40 dark:bg-orange-900/40', text: 'text-orange-800 dark:text-orange-300', icon: <ArrowPathIcon className="w-4 h-4" /> },
  };
  
  const { bg, text, icon } = config[status] || config.pending;
  const label = PAYMENT_STATUS_OPTIONS.find(o => o.value === status)?.label || status;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
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

  // Erro de qualquer uma das queries. Sem isto, uma falha de API deixava
  // `isLoading` false e a página renderizava zeros ("R$ 0,00 recebido",
  // "Nenhum pagamento encontrado") — enganando o lojista a achar que perdeu
  // o faturamento.
  const hasError = ordersQuery.isError || statsQuery.isError;
  const hasData = ordersQuery.data !== undefined || statsQuery.data !== undefined;

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
  const filterOptions = useMemo(() => {
    return PAYMENT_STATUS_OPTIONS.map(option => ({ ...option }));
  }, []);

  // Format currency
  const formatMoney = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Table columns
  const columns = [
    {
      key: 'order_number',
      header: 'Pedido',
      render: (order: Order) => (
        <div>
          <span className="font-semibold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)]">#{order.order_number}</span>
          <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">{order.customer_name}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Valor',
      render: (order: Order) => (
        <span className="font-semibold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)]">{formatMoney(order.total)}</span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Método',
      render: (order: Order) => {
        const method = order.payment_method || 'pix';
        const methodInfo = PAYMENT_METHOD_LABELS[method] || { label: method, icon: <CurrencyDollarIcon className="w-4 h-4" /> };
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-[var(--dark-text-primary,#FAF9F7)]">
            {methodInfo.icon}
            {methodInfo.label}
          </span>
        );
      },
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (order: Order) => (
        <PaymentStatusBadge status={order.payment_status || 'pending'} />
      ),
    },
    {
      key: 'payment_link',
      header: 'Link Pagamento',
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 rounded-lg font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="w-4 h-4" />
                Abrir
              </a>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await copyToClipboard(finalPaymentLink);
                  if (ok) toast.success('Link copiado! Envie para o cliente.');
                  else toast.error('Não foi possível copiar. Copie manualmente.');
                }}
                className="p-1.5 text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] hover:text-gray-700 dark:hover:text-zinc-300 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[var(--dark-bg-hover,#161616)] dark:bg-[var(--dark-bg-hover,#161616)] rounded"
                title="Copiar link"
              >
                <ClipboardIcon className="w-4 h-4" />
              </button>
            </div>
          );
        }
        
        // If payment method is cash, no link needed
        if (payment_method === 'cash') {
          return <span className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">💵 Dinheiro</span>;
        }
        
        // No payment info yet
        return <span className="text-sm text-gray-400">-</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (order: Order) => (
        <div className="text-sm">
          <p className="text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)]">{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p className="text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)]">{format(new Date(order.created_at), "HH:mm", { locale: ptBR })}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (order: Order) => (
        <div className="flex items-center gap-2">
          {order.payment_status === 'pending' && (
            <Button
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                handleConfirmPayment(order);
              }}
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Confirmar
            </Button>
          )}
          {order.payment_status === 'paid' && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Pago</span>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  // Falha total (sem nenhum dado em cache): não renderiza zeros enganosos —
  // mostra um estado de erro acionável com "Tentar novamente".
  if (hasError && !hasData) {
    return (
      <div className="p-6 space-y-6">
        <PageTitle title="Pagamentos" />
        <Card>
          <EmptyState
            icon={<ExclamationTriangleIcon className="w-8 h-8 text-red-500" />}
            title="Erro ao carregar pagamentos"
            description="Não foi possível carregar os dados de pagamento. Verifique sua conexão e tente novamente."
            action={{ label: 'Tentar novamente', onClick: retry }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Pagamentos"
        subtitle={`${stats.total} pedido(s) | ${formatMoney(stats.totalRevenue)} recebido`}
      />

      {/* Falha parcial: temos dados em cache mas uma query falhou ao atualizar.
          Aviso não-bloqueante para o lojista saber que os números podem não
          refletir o estado mais recente. */}
      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">
            Alguns dados podem estar desatualizados — houve uma falha ao atualizar.
          </span>
          <Button variant="secondary" size="sm" onClick={retry}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      )}

        {/* Stats Cards */}
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 dark:bg-green-900/40 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">Receita Hoje</p>
                <p className="text-xl font-bold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)] dark:text-[var(--dark-text-primary,#FAF9F7)]">{formatMoney(stats.todayRevenue)}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">{stats.todayCount} pedido(s)</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 dark:bg-blue-900/40 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">Total Recebido</p>
                <p className="text-xl font-bold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)] dark:text-[var(--dark-text-primary,#FAF9F7)]">{formatMoney(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">{stats.paidCount} pago(s)</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 dark:bg-amber-900/40 rounded-lg">
                <ClockIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">Aguardando</p>
                <p className="text-xl font-bold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)] dark:text-[var(--dark-text-primary,#FAF9F7)]">{stats.pendingCount}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">{formatMoney(stats.pendingRevenue)} a receber</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 dark:bg-purple-900/40 rounded-lg">
                <BanknotesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">Total Pedidos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-[var(--dark-text-primary,#FAF9F7)] dark:text-[var(--dark-text-primary,#FAF9F7)]">{stats.total}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--dark-text-secondary,#a1a1aa)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">todos os tempos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusFilter
            options={filterOptions}
            value={statusFilter}
            onChange={changeStatusFilter}
            className="flex-wrap"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* Payments Table */}
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
    </div>
  );
};

export default PaymentsPage;
