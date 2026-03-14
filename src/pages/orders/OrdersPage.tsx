import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge as ChakraBadge,
  Box,
  Flex,
  Grid,
  Heading,
  IconButton,
  Input as ChakraInput,
  InputGroup,
  Stack,
  Table,
  Tabs,
  Text,
} from '@chakra-ui/react';
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

const STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  all: { label: 'Todos', colorPalette: 'gray' },
  pending: { label: 'Recebidos', colorPalette: 'gray' },
  processing: { label: 'Processando', colorPalette: 'orange' },
  confirmed: { label: 'Confirmados', colorPalette: 'blue' },
  paid: { label: 'Pagos', colorPalette: 'green' },
  preparing: { label: 'Preparando', colorPalette: 'orange' },
  ready: { label: 'Prontos', colorPalette: 'purple' },
  shipped: { label: 'Enviados', colorPalette: 'cyan' },
  out_for_delivery: { label: 'Em entrega', colorPalette: 'blue' },
  delivered: { label: 'Entregues', colorPalette: 'green' },
  completed: { label: 'Concluidos', colorPalette: 'green' },
  cancelled: { label: 'Cancelados', colorPalette: 'red' },
  refunded: { label: 'Reembolsados', colorPalette: 'red' },
  failed: { label: 'Falharam', colorPalette: 'red' },
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
  nextOrders[existingIndex] = incomingOrder;
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
          ...patch,
        }
      : order
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  helper: string;
  accent: string;
  icon: React.ReactNode;
}> = ({ label, value, helper, accent, icon }) => (
  <Card>
    <Stack gap={3}>
      <Flex align="center" justify="space-between">
        <Box
          borderRadius="full"
          bg={accent}
          color="white"
          p={2.5}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </Box>
        <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="0.08em">
          {label}
        </Text>
      </Flex>
      <Stack gap={1}>
        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" color="fg.primary">
          {value}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {helper}
        </Text>
      </Stack>
    </Stack>
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
      <Box p={{ base: 4, md: 6 }}>
        <Card>
          <Stack gap={4}>
            <Heading size="lg">Pedidos</Heading>
            <Text color="fg.muted">
              Selecione uma loja para visualizar os pedidos e ativar o realtime.
            </Text>
            <Flex>
              <Button onClick={() => navigate('/stores')}>Ir para lojas</Button>
            </Flex>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Stack gap={6}>
        <Card variant="filled">
          <Stack gap={5}>
            <Flex
              align={{ base: 'flex-start', xl: 'center' }}
              justify="space-between"
              direction={{ base: 'column', xl: 'row' }}
              gap={4}
            >
              <Stack gap={2}>
                <Flex align="center" gap={3} wrap="wrap">
                  <Heading size="xl" color="fg.primary">
                    Pedidos
                  </Heading>
                  <ChakraBadge
                    colorPalette={realtimeConnected ? 'success' : connectionStatus === 'connecting' ? 'orange' : 'gray'}
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    <Flex align="center" gap={1.5}>
                      {realtimeConnected ? (
                        <SignalIcon className="h-3.5 w-3.5" />
                      ) : (
                        <SignalSlashIcon className="h-3.5 w-3.5" />
                      )}
                      <Text fontSize="xs" fontWeight="semibold">
                        {realtimeConnected ? 'Tempo real ativo' : connectionStatus === 'connecting' ? 'Reconectando' : 'Sem tempo real'}
                      </Text>
                    </Flex>
                  </ChakraBadge>
                  {transport && (
                    <ChakraBadge colorPalette="blue" variant="subtle" borderRadius="full" px={3} py={1}>
                      <Text fontSize="xs" fontWeight="semibold">
                        {TRANSPORT_LABELS[transport] || transport}
                      </Text>
                    </ChakraBadge>
                  )}
                </Flex>
                <Text color="fg.muted">
                  {effectiveStoreName} • {orders.length} pedido(s) carregado(s)
                  {lastSyncedAt ? ` • Ultima sincronia ${format(lastSyncedAt, 'HH:mm:ss', { locale: ptBR })}` : ''}
                </Text>
                {!realtimeConnected && connectionError && (
                  <Flex align="center" gap={3} wrap="wrap">
                    <Text fontSize="sm" color="orange.600">
                      {connectionError}
                    </Text>
                    <Button variant="outline" size="xs" onClick={() => reconnect()}>
                      Reconectar
                    </Button>
                  </Flex>
                )}
              </Stack>

              <Flex gap={3} wrap="wrap">
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
              </Flex>
            </Flex>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
              <MetricCard
                label="Pedidos ativos"
                value={String(metrics.actionable)}
                helper="Fila que exige acao operacional"
                accent="blue.500"
                icon={<Squares2X2Icon className="h-5 w-5" />}
              />
              <MetricCard
                label="Em entrega"
                value={String(metrics.deliveryQueue)}
                helper="Pedidos prontos, enviados ou em rota"
                accent="purple.500"
                icon={<TruckIcon className="h-5 w-5" />}
              />
              <MetricCard
                label="Receita paga"
                value={`R$ ${formatMoney(metrics.revenue)}`}
                helper="Total confirmado no periodo carregado"
                accent="green.500"
                icon={<BanknotesIcon className="h-5 w-5" />}
              />
              <MetricCard
                label="Clientes"
                value={String(metrics.customers)}
                helper="Base unica de clientes na lista atual"
                accent="orange.500"
                icon={<UserGroupIcon className="h-5 w-5" />}
              />
            </Grid>
          </Stack>
        </Card>

        <Card>
          <Stack gap={4}>
            <Flex align={{ base: 'stretch', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4}>
              <InputGroup
                flex={1}
                startElement={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
              >
                <ChakraInput
                  placeholder="Buscar por numero do pedido, cliente ou telefone"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </InputGroup>

              <Flex
                align="center"
                justify="space-between"
                gap={3}
                wrap="wrap"
              >
                <Flex bg="bg.secondary" borderRadius="lg" p={1}>
                  <IconButton
                    aria-label="Kanban"
                    size="sm"
                    variant={viewMode === 'kanban' ? 'solid' : 'ghost'}
                    onClick={() => setViewMode('kanban')}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    aria-label="Tabela"
                    size="sm"
                    variant={viewMode === 'table' ? 'solid' : 'ghost'}
                    onClick={() => setViewMode('table')}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </IconButton>
                </Flex>

                <Text fontSize="sm" color="fg.muted">
                  {filteredOrders.length} pedido(s) visivel(is)
                </Text>
              </Flex>
            </Flex>

            <Box
              overflowX="auto"
              pb={2}
              css={{
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { height: '6px' },
              }}
            >
              <Tabs.Root
                value={statusFilter}
                onValueChange={(details) => {
                  const value = (details as { value: string }).value;
                  if (value === 'all' || isOrderStatus(value)) {
                    setStatusFilter(value as OrderStatus | 'all');
                  }
                }}
              >
                <Tabs.List display="flex" flexWrap="nowrap" gap={2} minW="max-content" py={1}>
                  <Tabs.Trigger value="all" flexShrink={0}>
                    <Text whiteSpace="nowrap">Todos</Text>
                    <ChakraBadge ml={2} size="sm" variant="subtle" borderRadius="full">
                      {statusCounts.all}
                    </ChakraBadge>
                  </Tabs.Trigger>
                  {ORDER_STATUS_VALUES.map((status) => (
                    <Tabs.Trigger key={status} value={status} flexShrink={0}>
                      <Text whiteSpace="nowrap">
                        {STATUS_CONFIG[status]?.label || status}
                      </Text>
                      <ChakraBadge
                        ml={2}
                        size="sm"
                        variant="subtle"
                        colorPalette={STATUS_CONFIG[status]?.colorPalette as 'gray'}
                        borderRadius="full"
                      >
                        {statusCounts[status] || 0}
                      </ChakraBadge>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </Tabs.Root>
            </Box>
          </Stack>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card>
            <Stack gap={2} py={8} textAlign="center">
              <Heading size="md" color="fg.primary">
                Nenhum pedido encontrado
              </Heading>
              <Text color="fg.muted">
                Ajuste os filtros ou aguarde novos eventos em tempo real.
              </Text>
            </Stack>
          </Card>
        ) : viewMode === 'kanban' ? (
          <Card noPadding>
            <Box p={{ base: 3, md: 4 }}>
              <OrdersKanban
                orders={filteredOrders}
                visibleStatuses={statusFilter === 'all' ? undefined : [statusFilter]}
                onOrderClick={(order) =>
                  navigate(`/stores/${effectiveStoreId || effectiveStoreSlug || 'default'}/orders/${order.id}`)
                }
                onStatusChange={handleUpdateOrder}
              />
            </Box>
          </Card>
        ) : (
          <Card noPadding>
            <Box overflowX="auto">
              <Table.Root variant="line">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Pedido</Table.ColumnHeader>
                    <Table.ColumnHeader>Cliente</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Pagamento</Table.ColumnHeader>
                    <Table.ColumnHeader>Total</Table.ColumnHeader>
                    <Table.ColumnHeader>Atualizado</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredOrders.map((order) => (
                    <Table.Row
                      key={order.id}
                      cursor="pointer"
                      onClick={() =>
                        navigate(`/stores/${effectiveStoreId || effectiveStoreSlug || 'default'}/orders/${order.id}`)
                      }
                      _hover={{ bg: 'bg.hover' }}
                    >
                      <Table.Cell>
                        <Stack gap={1}>
                          <Text fontWeight="semibold" color="fg.primary">
                            #{order.order_number}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {order.items_count ?? order.items?.length ?? 0} item(ns)
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Stack gap={1}>
                          <Text color="fg.primary">{order.customer_name || 'Cliente'}</Text>
                          <Text fontSize="xs" color="fg.muted">
                            {order.customer_phone || 'Telefone nao informado'}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <OrderStatusBadge status={order.status} />
                      </Table.Cell>
                      <Table.Cell>
                        <ChakraBadge
                          colorPalette={order.payment_status === 'paid' ? 'green' : order.payment_status === 'failed' ? 'red' : 'orange'}
                          variant="subtle"
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {paymentStatusLabel(order.payment_status)}
                        </ChakraBadge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="semibold" color="fg.primary">
                          R$ {formatMoney(order.total)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {format(new Date(order.updated_at || order.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default OrdersPage;
