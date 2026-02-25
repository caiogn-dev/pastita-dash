/**
 * OrdersPage - Página de pedidos moderna com Chakra UI v3
 * Mantém toda funcionalidade existente, apenas melhora UI
 */
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Badge,
  IconButton,
  Input as ChakraInput,
  Skeleton,
  Tabs,
  Table,
} from '@chakra-ui/react';
import { 
  MagnifyingGlassIcon, 
  TruckIcon, 
  CreditCardIcon, 
  XMarkIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ArrowPathIcon,
  SignalIcon,
  SignalSlashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
  Card, 
  Button, 
  OrderStatusBadge, 
  Input, 
  PageLoading,
  PageTitle,
} from '../../components/common';
import { OrdersKanban, ORDER_STATUSES } from '../../components/orders/OrdersKanban';
import { exportService, getErrorMessage, ordersService } from '../../services';
import { useStore, useOrdersWebSocket, useNotificationSound } from '../../hooks';
import { Order } from '../../types';

type ViewMode = 'kanban' | 'table';
type OrderStatus = Order['status'];
type PaymentStatus = NonNullable<Order['payment_status']>;

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending', 'processing', 'confirmed', 'paid', 'preparing', 
  'ready', 'shipped', 'out_for_delivery', 'delivered', 
  'completed', 'cancelled', 'refunded', 'failed',
];

const isOrderStatus = (value: unknown): value is OrderStatus => {
  return ORDER_STATUS_VALUES.includes(String(value) as OrderStatus);
};

const formatMoney = (value: number | string | null | undefined) => {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

// Status config para tabs
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  all: { label: 'Todos', color: 'gray' },
  pending: { label: 'Pendentes', color: 'yellow' },
  processing: { label: 'Processando', color: 'blue' },
  confirmed: { label: 'Confirmados', color: 'green' },
  paid: { label: 'Pagos', color: 'green' },
  preparing: { label: 'Preparando', color: 'blue' },
  ready: { label: 'Prontos', color: 'green' },
  shipped: { label: 'Enviados', color: 'blue' },
  out_for_delivery: { label: 'Em Entrega', color: 'orange' },
  delivered: { label: 'Entregues', color: 'green' },
  completed: { label: 'Concluídos', color: 'green' },
  cancelled: { label: 'Cancelados', color: 'red' },
  refunded: { label: 'Reembolsados', color: 'gray' },
  failed: { label: 'Falhou', color: 'red' },
};

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeSlug, storeName, stores } = useStore();
  
  const effectiveStoreId = routeStoreId || storeSlug || contextStoreId;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  const { playNotification } = useNotificationSound();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // WebSocket para atualizações em tempo real
  useOrdersWebSocket({
    storeId: effectiveStoreId,
    onOrderUpdate: (updatedOrder) => {
      setOrders(prev => 
        prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
      );
      playNotification();
    },
    onNewOrder: (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
      playNotification();
      toast.success(`Novo pedido #${newOrder.order_number}!`);
    },
    onConnect: () => setWsConnected(true),
    onDisconnect: () => setWsConnected(false),
  });

  // Carrega pedidos
  const loadOrders = useCallback(async () => {
    if (!effectiveStoreId) return;
    setLoading(true);
    try {
      const response = await ordersService.getOrders(effectiveStoreId);
      setOrders(response.results || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filtra pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchQuery || 
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Contagem por status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    ORDER_STATUS_VALUES.forEach(status => {
      counts[status] = orders.filter(o => o.status === status).length;
    });
    return counts;
  }, [orders]);

  // Exportar pedidos
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportService.exportOrders({ 
        store_id: effectiveStoreId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      toast.success('Exportação iniciada!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  // Atualizar status do pedido
  const handleUpdateOrder = async (data: Partial<Order>) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      await ordersService.updateOrder(selectedOrder.id, data);
      toast.success('Pedido atualizado!');
      setIsUpdateModalOpen(false);
      loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <PageLoading message="Carregando pedidos..." />;
  }

  return (
    <Box p={6}>
      <Stack gap={6}>
        {/* Header Moderno */}
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
          <Stack gap={1}>
            <Flex align="center" gap={3}>
              <Heading size="xl" color="fg.primary">Pedidos</Heading>
              <Badge 
                colorPalette={wsConnected ? 'success' : 'gray'}
                size="sm"
                borderRadius="full"
              >
                <Flex align="center" gap={1}>
                  {wsConnected ? <SignalIcon className="w-3 h-3" /> : <SignalSlashIcon className="w-3 h-3" />}
                  {wsConnected ? 'Online' : 'Offline'}
                </Flex>
              </Badge>
            </Flex>
            <Text color="fg.muted">
              {orders.length} pedido(s) • {filteredOrders.length} filtrado(s)
              {storeName && ` • ${storeName}`}
            </Text>
          </Stack>
          
          <Flex gap={3}>
            <Button
              variant="outline"
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={handleExport}
              isLoading={isExporting}
              size="sm"
            >
              Exportar
            </Button>
            
            <Button
              leftIcon={<PlusIcon className="w-4 h-4" />}
              onClick={() => navigate('/orders/new')}
              size="sm"
            >
              Novo Pedido
            </Button>
          </Flex>
        </Flex>

        {/* Barra de Ferramentas */}
        <Card variant="filled" size="sm">
          <Flex gap={4} align="center" wrap="wrap">
            {/* Busca */}
            <Flex flex={1} minW="300px">
              <ChakraInput
                ref={searchInputRef}
                placeholder="Buscar por número, cliente ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftElement={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
              />
            </Flex>
            
            {/* Toggle View */}
            <Flex bg="bg.secondary" p={1} borderRadius="md">
              <IconButton
                aria-label="Tabela"
                variant={viewMode === 'table' ? 'solid' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <ListBulletIcon className="w-4 h-4" />
              </IconButton>
              <IconButton
                aria-label="Kanban"
                variant={viewMode === 'kanban' ? 'solid' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </IconButton>
            </Flex>
            
            {/* Refresh */}
            <IconButton
              aria-label="Atualizar"
              variant="ghost"
              size="sm"
              onClick={loadOrders}
              isLoading={loading}
            >
              <ArrowPathIcon className="w-4 h-4" />
            </IconButton>
          </Flex>
        </Card>

        {/* Tabs de Status */}
        <Tabs.Root 
          value={statusFilter} 
          onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}
        >
          <Tabs.List>
            <Tabs.Trigger value="all">
              Todos <Badge ml={2} size="sm">{statusCounts.all}</Badge>
            </Tabs.Trigger>
            {ORDER_STATUS_VALUES.map(status => (
              <Tabs.Trigger key={status} value={status}>
                {STATUS_CONFIG[status]?.label || status}
                <Badge ml={2} size="sm" colorPalette={STATUS_CONFIG[status]?.color as any}>
                  {statusCounts[status] || 0}
                </Badge>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>

        {/* Conteúdo */}
        {viewMode === 'table' ? (
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
                    <Table.ColumnHeader>Data</Table.ColumnHeader>
                    <Table.ColumnHeader width="100px">Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredOrders.map((order) => (
                    <Table.Row 
                      key={order.id}
                      cursor="pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      _hover={{ bg: 'bg.hover' }}
                    >
                      <Table.Cell>
                        <Stack gap={0.5}>
                          <Text fontWeight="semibold" color="fg.primary">
                            #{order.order_number}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {order.items?.length || 0} item(s)
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Stack gap={0.5}>
                          <Text color="fg.primary">{order.customer_name}</Text>
                          <Text fontSize="xs" color="fg.muted">
                            {order.customer_phone}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <OrderStatusBadge status={order.status} />
                      </Table.Cell>
                      <Table.Cell>
                        <Badge 
                          variant="subtle" 
                          colorPalette={
                            order.payment_status === 'paid' ? 'success' : 
                            order.payment_status === 'pending' ? 'warning' : 'gray'
                          }
                        >
                          {order.payment_status || 'N/A'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="semibold" color="fg.primary">
                          R$ {formatMoney(order.total)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg.muted">
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </Text>
                      </Table.Cell>
                      <Table.Cell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          aria-label="Editar"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsUpdateModalOpen(true);
                          }}
                        >
                          <FunnelIcon className="w-4 h-4" />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card>
        ) : (
          <OrdersKanban 
            orders={filteredOrders}
            onOrderClick={(order) => navigate(`/orders/${order.id}`)}
            onOrderUpdate={handleUpdateOrder}
          />
        )}
      </Stack>
    </Box>
  );
};

export default OrdersPage;
