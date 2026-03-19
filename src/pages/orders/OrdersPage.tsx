import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SignalIcon,
  SignalSlashIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Button, Card, OrderStatusBadge, PageLoading } from '../../components/common';
import { OrdersKanban } from '../../components/orders/OrdersKanban';
import { exportService, getErrorMessage, ordersService } from '../../services';
import { useNotificationSound, useOrdersWebSocket, useStore } from '../../hooks';
import { useStoreContextStore } from '../../stores/storeContextStore';
import { Order } from '../../types';

type ViewMode = 'kanban' | 'table';
type OrderStatus = Order['status'];

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending',
  'processing',
  'confirmed',
  'paid',
  'preparing',
  'ready',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'failed',
];

const STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
  all: { label: 'Todos', colorClass: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300' },
  pending: { label: 'Recebidos', colorClass: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300' },
  processing: { label: 'Processando', colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  confirmed: { label: 'Confirmados', colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  paid: { label: 'Pagos', colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  preparing: { label: 'Preparando', colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ready: { label: 'Prontos', colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  shipped: { label: 'Enviados', colorClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  out_for_delivery: { label: 'Em entrega', colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  delivered: { label: 'Entregues', colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Concluidos', colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelados', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  refunded: { label: 'Reembolsados', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  failed: { label: 'Falharam', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const TRANSPORT_LABELS: Record<string, string> = {
  websocket: 'WebSocket',
  sse: 'SSE',
  polling: 'Polling',
};

const ACTIONABLE_STATUSES = new Set<OrderStatus>([
  'pending',
  'processing',
  'confirmed',
  'preparing',
]);

const DELIVERY_QUEUE_STATUSES = new Set<OrderStatus>([
  'ready',
  'shipped',
  'out_for_delivery',
]);

const isOrderStatus = (value: unknown): value is OrderStatus => {
  return ORDER_STATUS_VALUES.includes(String(value) as OrderStatus);
};

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const formatMoney = (value: number | string | null | undefined) => {
  const numericValue = typeof value === 'string' ? Number(value) : value ?? 0;
  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const paymentStatusLabel = (status?: string) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  switch (normalizedStatus) {
    case 'paid':
      return 'Pago';
    case 'failed':
      return 'Falhou';
    case 'refunded':
      return 'Reembolsado';
    default:
      return 'Pendente';
  }
};

const mergeOrder = (currentOrders: Order[], incomingOrder: Order) => {
  const existingIndex = currentOrders.findIndex((order) => order.id === incomingOrder.id);
  if (existingIndex === -1) {
    return [incomingOrder, ...currentOrders];
  }

  const nextOrders = [...currentOrders];
  nextOrders[existingIndex] = {
    ...nextOrders[existingIndex],
    ...Object.fromEntries(
      Object.entries(incomingOrder).filter(([, value]) => value !== undefined)
    ),
  };
  return nextOrders;
};

const patchOrder = (
  currentOrders: Order[],
  orderId: string | undefined,
  patch: Partial<Order>
) => {
  if (!orderId) {
    return currentOrders;
  }

  return currentOrders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          ...Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined)
          ),
        }
      : order
  );
};

const formatOrderDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return format(parsed, 'dd/MM HH:mm', { locale: ptBR });
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  helper: string;
  accentClass: string;
  icon: React.ReactNode;
}> = ({ label, value, helper, accentClass, icon }) => (
  <Card>
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`rounded-full ${accentClass} p-2.5 inline-flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </span>
        <span className="text-sm text-gray-500 dark:text-zinc-400">
          {helper}
        </span>
      </div>
    </div>
  </Card>
);

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreParam } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeSlug, storeName, stores } = useStore();
  const selectStoreById = useStoreContextStore((state) => state.selectStoreById);
  const selectStoreBySlug = useStoreContextStore((state) => state.selectStoreBySlug);

  const routeStore = useMemo(() => {
    if (!routeStoreParam) {
      return null;
    }

    return (
      stores.find((store) => store.id === routeStoreParam || store.slug === routeStoreParam) || null
    );
  }, [routeStoreParam, stores]);

  const effectiveStoreId =
    routeStore?.id ||
    contextStoreId ||
    (routeStoreParam && isUuidLike(routeStoreParam) ? routeStoreParam : null);
  const effectiveStoreSlug =
    routeStore?.slug ||
    storeSlug ||
    (routeStoreParam && !isUuidLike(routeStoreParam) ? routeStoreParam : null);
  const effectiveStoreQuery = routeStoreParam || effectiveStoreSlug || effectiveStoreId;
  const effectiveStoreName = routeStore?.name || storeName || 'Loja selecionada';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    if (!routeStoreParam || stores.length === 0) {
      return;
    }

    const matchedStore = stores.find(
      (store) => store.id === routeStoreParam || store.slug === routeStoreParam
    );

    if (!matchedStore) {
      return;
    }

    if (matchedStore.id !== contextStoreId) {
      if (matchedStore.id === routeStoreParam) {
        selectStoreById(matchedStore.id);
      } else {
        selectStoreBySlug(matchedStore.slug);
      }
    }
  }, [contextStoreId, routeStoreParam, selectStoreById, selectStoreBySlug, stores]);

  const loadOrders = useCallback(
    async (background = false) => {
      if (!effectiveStoreQuery) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await ordersService.getOrders({ store: effectiveStoreQuery });
        setOrders(response.results || []);
        setLastSyncedAt(new Date());
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveStoreQuery]
  );

  const scheduleReload = useCallback(
    (delay = 1200) => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        loadOrders(true);
      }, delay);
    },
    [loadOrders]
  );

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const applyRealtimePatch = useCallback((payload: { order_id?: string; status?: string; payment_status?: string; updated_at?: string }) => {
    setOrders((currentOrders) =>
      patchOrder(currentOrders, payload.order_id, {
        status: payload.status as OrderStatus | undefined,
        payment_status: payload.payment_status as Order['payment_status'] | undefined,
        updated_at: payload.updated_at,
      })
    );
    setLastSyncedAt(new Date());
  }, []);

  const {
    isConnected: realtimeConnected,
    connectionError,
    transport,
    status: connectionStatus,
    reconnect,
  } = useOrdersWebSocket({
    enabled: Boolean(effectiveStoreSlug || effectiveStoreQuery),
    onOrderCreated: (payload) => {
      playNotificationSound();
      toast.success(`Novo pedido #${payload.order_number || payload.order_id?.slice(0, 8)}`);
      scheduleReload(250);
    },
    onOrderUpdated: (payload) => {
      applyRealtimePatch(payload);
      scheduleReload(1400);
    },
    onOrderCancelled: (payload) => {
      applyRealtimePatch(payload);
      toast.error(`Pedido #${payload.order_number || payload.order_id?.slice(0, 8)} cancelado`);
      scheduleReload(1400);
    },
    onPaymentReceived: (payload) => {
      playNotificationSound();
      applyRealtimePatch({
        ...payload,
        payment_status: 'paid',
      });
      toast.success(`Pagamento confirmado para o pedido #${payload.order_number || payload.order_id?.slice(0, 8)}`);
      scheduleReload(900);
    },
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    ORDER_STATUS_VALUES.forEach((status) => {
      counts[status] = orders.filter((order) => order.status === status).length;
    });
    return counts;
  }, [orders]);

  const metrics = useMemo(() => {
    const actionableOrders = orders.filter((order) => ACTIONABLE_STATUSES.has(order.status));
    const deliveryQueue = orders.filter((order) => DELIVERY_QUEUE_STATUSES.has(order.status));
    const paidRevenue = orders
      .filter((order) => order.payment_status === 'paid')
      .reduce((total, order) => total + Number(order.total || 0), 0);
    const uniqueCustomers = new Set(
      orders
        .map((order) => order.customer_phone || order.customer_email || order.customer_name)
        .filter(Boolean)
    ).size;

    return {
      total: orders.length,
      actionable: actionableOrders.length,
      deliveryQueue: deliveryQueue.length,
      revenue: paidRevenue,
      customers: uniqueCustomers,
    };
  }, [orders]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportService.exportOrders({
        store: effectiveStoreQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      toast.success('Exportacao iniciada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updatedOrder = await ordersService.updateStatus(orderId, newStatus);
      setOrders((currentOrders) => mergeOrder(currentOrders, updatedOrder));
      setLastSyncedAt(new Date());
      toast.success('Status do pedido atualizado');
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!effectiveStoreQuery) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pedidos</h2>
            <p className="text-gray-500 dark:text-zinc-400">
              Selecione uma loja para visualizar os pedidos e ativar o realtime.
            </p>
            <div>
              <Button onClick={() => navigate('/stores')}>Ir para lojas</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Realtime badge classes
  const realtimeBadgeClass = realtimeConnected
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : connectionStatus === 'connecting'
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header Card */}
        <Card variant="filled">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${realtimeBadgeClass}`}>
                    {realtimeConnected ? (
                      <SignalIcon className="h-3.5 w-3.5" />
                    ) : (
                      <SignalSlashIcon className="h-3.5 w-3.5" />
                    )}
                    {realtimeConnected
                      ? 'Tempo real ativo'
                      : connectionStatus === 'connecting'
                      ? 'Reconectando'
                      : 'Sem tempo real'}
                  </span>
                  {transport && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {TRANSPORT_LABELS[transport] || transport}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-zinc-400">
                  {effectiveStoreName} • {orders.length} pedido(s) carregado(s)
                  {lastSyncedAt ? ` • Ultima sincronia ${format(lastSyncedAt, 'HH:mm:ss', { locale: ptBR })}` : ''}
                </p>
                {!realtimeConnected && connectionError && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      {connectionError}
                    </span>
                    <Button variant="outline" size="xs" onClick={() => reconnect()}>
                      Reconectar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isExporting}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  onClick={handleExport}
                >
                  Exportar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={() => loadOrders(true)}
                  isLoading={refreshing}
                >
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => navigate(`/stores/${effectiveStoreId || effectiveStoreSlug || 'default'}/orders/new`)}
                >
                  Novo pedido
                </Button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Pedidos ativos"
                value={String(metrics.actionable)}
                helper="Fila que exige acao operacional"
                accentClass="bg-blue-500 text-white"
                icon={<Squares2X2Icon className="h-5 w-5" />}
              />
              <MetricCard
                label="Em entrega"
                value={String(metrics.deliveryQueue)}
                helper="Pedidos prontos, enviados ou em rota"
                accentClass="bg-purple-500 text-white"
                icon={<TruckIcon className="h-5 w-5" />}
              />
              <MetricCard
                label="Receita paga"
                value={`R$ ${formatMoney(metrics.revenue)}`}
                helper="Total confirmado no periodo carregado"
                accentClass="bg-green-500 text-white"
                icon={<BanknotesIcon className="h-5 w-5" />}
              />
              <MetricCard
                label="Clientes"
                value={String(metrics.customers)}
                helper="Base unica de clientes na lista atual"
                accentClass="bg-orange-500 text-white"
                icon={<UserGroupIcon className="h-5 w-5" />}
              />
            </div>
          </div>
        </Card>

        {/* Filter / Search Card */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por numero do pedido, cliente ou telefone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* View mode toggle */}
                <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                  <button
                    aria-label="Kanban"
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'kanban'
                        ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Tabela"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                </div>

                <span className="text-sm text-gray-500 dark:text-zinc-400">
                  {filteredOrders.length} pedido(s) visivel(is)
                </span>
              </div>
            </div>

            {/* Status Tabs */}
            <div
              className="overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex gap-1.5 min-w-max py-1">
                {(['all', ...ORDER_STATUS_VALUES] as const).map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  const count = statusCounts[status] ?? 0;
                  const isActive = statusFilter === status;
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        if (status === 'all' || isOrderStatus(status)) {
                          setStatusFilter(status as OrderStatus | 'all');
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {cfg?.label || status}
                      <span
                        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : cfg?.colorClass || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Content */}
        {filteredOrders.length === 0 ? (
          <Card>
            <div className="flex flex-col gap-2 py-8 text-center">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Nenhum pedido encontrado
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Ajuste os filtros ou aguarde novos eventos em tempo real.
              </p>
            </div>
          </Card>
        ) : viewMode === 'kanban' ? (
          <Card noPadding>
            <div className="p-3 md:p-4">
              <OrdersKanban
                orders={filteredOrders}
                visibleStatuses={statusFilter === 'all' ? undefined : [statusFilter]}
                onOrderClick={(order) =>
                  navigate(`/stores/${effectiveStoreId || effectiveStoreSlug || 'default'}/orders/${order.id}`)
                }
                onStatusChange={handleUpdateOrder}
              />
            </div>
          </Card>
        ) : (
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Pedido</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Pagamento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {filteredOrders.map((order) => {
                    const payStatus = String(order.payment_status || 'pending').toLowerCase();
                    const payColorClass = PAYMENT_STATUS_COLOR[payStatus] || PAYMENT_STATUS_COLOR.pending;
                    return (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                        onClick={() =>
                          navigate(`/stores/${effectiveStoreId || effectiveStoreSlug || 'default'}/orders/${order.id}`)
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              #{order.order_number}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-zinc-400">
                              {order.items_count ?? order.items?.length ?? 0} item(ns)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-gray-900 dark:text-white">{order.customer_name || 'Cliente'}</span>
                            <span className="text-xs text-gray-500 dark:text-zinc-400">
                              {order.customer_phone || 'Telefone nao informado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${payColorClass}`}>
                            {paymentStatusLabel(order.payment_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            R$ {formatMoney(order.total)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 dark:text-zinc-400">
                            {formatOrderDateTime(order.updated_at || order.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
