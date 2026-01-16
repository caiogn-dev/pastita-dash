import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { 
  Card, 
  Button, 
  Table, 
  OrderStatusBadge, 
  Modal, 
  Input, 
  Select, 
  PageLoading,
  OrderStatusTabs,
} from '../../components/common';
import { OrdersKanban, ORDER_STATUSES } from '../../components/orders/OrdersKanban';
import { exportService, getErrorMessage } from '../../services';
import { unifiedApi, UnifiedOrder, UnifiedOrderFilters } from '../../services/unifiedApi';
import { useStore, useOrdersWebSocket, useNotificationSound } from '../../hooks';

type ViewMode = 'kanban' | 'table';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, storeName } = useStore();
  
  // Use route storeId if available, otherwise use context
  const effectiveStoreId = routeStoreId || contextStoreId;
  
  // State
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [actionModal, setActionModal] = useState<'ship' | 'payment' | 'cancel' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form states
  const [shipForm, setShipForm] = useState({ tracking_code: '', carrier: '' });
  const [paymentForm, setPaymentForm] = useState({ payment_reference: '' });
  const [cancelForm, setCancelForm] = useState({ reason: '' });
  
  // Notification sound
  const { playOrderSound, playSuccessSound } = useNotificationSound({ enabled: true });
  
  // Real-time WebSocket connection
  const { isConnected, connectionError } = useOrdersWebSocket({
    onOrderCreated: (data) => {
      playOrderSound();
      toast.success(`🎉 Novo pedido #${data.order_number || data.order_id?.slice(0, 8)}!`, {
        duration: 6000,
        icon: '🛒',
      });
      loadOrders();
    },
    onOrderUpdated: () => {
      loadOrders();
    },
    onStatusChanged: (data) => {
      toast(`📦 Pedido #${data.order_number} → ${data.status}`, {
        duration: 4000,
      });
      loadOrders();
    },
    onPaymentReceived: (data) => {
      playSuccessSound();
      toast.success(`💰 Pagamento confirmado - #${data.order_number || data.order_id?.slice(0, 8)}!`, {
        duration: 6000,
      });
      loadOrders();
    },
    enabled: true,
  });

  // Load orders from unified API
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: UnifiedOrderFilters = {
        store: effectiveStoreId || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      };
      
      const response = await unifiedApi.getOrders(filters);
      setOrders(response.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveStoreId, statusFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle status change from Kanban drag-and-drop (optimistic update handled by Kanban)
  const handleKanbanStatusChange = async (orderId: string, newStatus: string) => {
    // Map status to API action
    switch (newStatus) {
      case 'confirmed':
        await unifiedApi.confirmOrder(orderId);
        break;
      case 'preparing':
        await unifiedApi.prepareOrder(orderId);
        break;
      case 'ready':
        await unifiedApi.updateOrderStatus(orderId, 'ready');
        break;
      case 'out_for_delivery':
        await unifiedApi.updateOrderStatus(orderId, 'out_for_delivery');
        break;
      case 'delivered':
        await unifiedApi.deliverOrder(orderId);
        break;
      case 'cancelled':
        await unifiedApi.cancelOrder(orderId, 'Cancelado via Kanban');
        break;
      default:
        throw new Error(`Status não suportado: ${newStatus}`);
    }
    toast.success('Status atualizado!');
    // Note: No loadOrders() here - Kanban handles optimistic updates
  };

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filter orders (client-side for search)
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter((order) =>
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_phone?.includes(query) ||
      order.customer_email?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // Export orders
  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const blob = await exportService.exportOrders({
        format,
        status: statusFilter || undefined,
      });
      const dateStamp = new Date().toISOString().slice(0, 10);
      exportService.downloadBlob(blob, `pedidos-${dateStamp}.${format}`);
      toast.success('Exportação concluída!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  // Get available actions for an order
  const getOrderActions = (order: UnifiedOrder) => {
    const actions: Array<{ 
      action: string; 
      label: string; 
      variant?: 'primary' | 'secondary' | 'danger'; 
      icon?: React.ReactNode 
    }> = [];
    
    const status = order.status.toLowerCase();
    
    switch (status) {
      case 'pending':
      case 'pendente':
        actions.push({ action: 'confirm', label: 'Confirmar', variant: 'primary' });
        break;
      case 'confirmed':
      case 'confirmado':
      case 'aprovado':
        actions.push({ action: 'prepare', label: 'Preparar', variant: 'primary' });
        break;
      case 'preparing':
      case 'preparando':
        actions.push({ action: 'ship', label: 'Enviar', variant: 'primary', icon: <TruckIcon className="w-4 h-4" /> });
        break;
      case 'shipped':
      case 'enviado':
        actions.push({ action: 'deliver', label: 'Entregar', variant: 'primary' });
        break;
      case 'awaiting_payment':
        actions.push({ action: 'mark_paid', label: 'Confirmar Pagamento', variant: 'primary', icon: <CreditCardIcon className="w-4 h-4" /> });
        break;
    }
    
    // Cancel action for non-final statuses
    const finalStatuses = ['cancelled', 'cancelado', 'delivered', 'entregue', 'refunded'];
    if (!finalStatuses.includes(status)) {
      actions.push({ action: 'cancel', label: 'Cancelar', variant: 'danger', icon: <XMarkIcon className="w-4 h-4" /> });
    }
    
    return actions;
  };

  // Handle action click
  const handleAction = (order: UnifiedOrder, action: string) => {
    setSelectedOrder(order);
    
    switch (action) {
      case 'ship':
        setActionModal('ship');
        break;
      case 'mark_paid':
        setActionModal('payment');
        break;
      case 'cancel':
        setActionModal('cancel');
        break;
      default:
        handleStatusUpdate(order, action);
    }
  };

  // Update order status via API
  const handleStatusUpdate = async (order: UnifiedOrder, action: string) => {
    setIsUpdating(true);
    try {
      switch (action) {
        case 'confirm':
          await unifiedApi.confirmOrder(order.id);
          break;
        case 'prepare':
          await unifiedApi.prepareOrder(order.id);
          break;
        case 'deliver':
          await unifiedApi.deliverOrder(order.id);
          break;
        default:
          throw new Error(`Ação desconhecida: ${action}`);
      }
      toast.success('Status atualizado!');
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle ship form submit
  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    setIsUpdating(true);
    try {
      await unifiedApi.shipOrder(selectedOrder.id, shipForm.tracking_code, shipForm.carrier);
      toast.success('Pedido marcado como enviado!');
      setActionModal(null);
      setSelectedOrder(null);
      setShipForm({ tracking_code: '', carrier: '' });
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle payment form submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    setIsUpdating(true);
    try {
      await unifiedApi.markPaid(selectedOrder.id, paymentForm.payment_reference);
      toast.success('Pagamento confirmado!');
      setActionModal(null);
      setSelectedOrder(null);
      setPaymentForm({ payment_reference: '' });
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel form submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    setIsUpdating(true);
    try {
      await unifiedApi.cancelOrder(selectedOrder.id, cancelForm.reason);
      toast.success('Pedido cancelado!');
      setActionModal(null);
      setSelectedOrder(null);
      setCancelForm({ reason: '' });
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'order_number',
      header: 'Pedido',
      render: (order: UnifiedOrder) => (
        <div>
          <p className="font-semibold text-gray-900">#{order.order_number}</p>
          <p className="text-sm text-gray-500">
            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
          {order.source && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
              {order.source}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (order: UnifiedOrder) => (
        <div>
          <p className="font-medium text-gray-900">{order.customer_name || '-'}</p>
          <p className="text-sm text-gray-500">{order.customer_phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Itens',
      render: (order: UnifiedOrder) => (
        <span className="text-sm font-medium text-gray-900">
          {order.items_count || 0} item(ns)
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order: UnifiedOrder) => (
        <span className="font-semibold text-gray-900">
          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: UnifiedOrder) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (order: UnifiedOrder) => {
        const actions = getOrderActions(order);
        return (
          <div className="flex items-center gap-2">
            {actions.slice(0, 2).map((action) => (
              <Button
                key={action.action}
                size="sm"
                variant={action.variant || 'secondary'}
                leftIcon={action.icon}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(order, action.action);
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  // Visible statuses for Kanban
  const visibleStatuses = useMemo(() => {
    if (showAllStatuses) {
      return ORDER_STATUSES.map(s => s.id);
    }
    // Default: show active statuses (full delivery flow)
    return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  }, [showAllStatuses]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Pedidos"
        subtitle={`${filteredOrders.length} pedido(s)${storeName ? ` - ${storeName}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* WebSocket Connection Status */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
              title={isConnected ? 'Conectado - Atualizações em tempo real' : connectionError || 'Desconectado'}
            >
              {isConnected ? (
                <>
                  <SignalIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ao vivo</span>
                </>
              ) : (
                <>
                  <SignalSlashIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="Visualização Kanban"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="Visualização em Lista"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="secondary"
              size="sm"
              onClick={loadOrders}
              title="Atualizar"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </Button>

            {/* Show All Statuses (Kanban only) */}
            {viewMode === 'kanban' && (
              <Button
                variant={showAllStatuses ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowAllStatuses(!showAllStatuses)}
                title="Mostrar todos os status"
              >
                <FunnelIcon className="w-4 h-4" />
              </Button>
            )}

            {/* Export */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              isLoading={isExporting}
              className="hidden sm:inline-flex"
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('xlsx')}
              isLoading={isExporting}
              className="hidden sm:inline-flex"
            >
              XLSX
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-4 overflow-hidden">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="flex-1 overflow-hidden">
            <OrdersKanban
              orders={filteredOrders}
              onOrderClick={(order) => navigate(`/orders/${order.id}`)}
              onStatusChange={handleKanbanStatusChange}
              visibleStatuses={visibleStatuses}
            />
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            {/* Status Tabs */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <OrderStatusTabs
                value={statusFilter}
                onChange={setStatusFilter}
                counts={statusCounts}
              />
            </div>

            {/* Orders Table */}
            <Card>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum pedido encontrado</p>
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={filteredOrders}
                  keyExtractor={(order) => order.id}
                  onRowClick={(order) => navigate(`/orders/${order.id}`)}
                />
              )}
            </Card>
          </>
        )}
      </div>

      {/* Ship Modal */}
      <Modal
        isOpen={actionModal === 'ship'}
        onClose={() => {
          setActionModal(null);
          setSelectedOrder(null);
        }}
        title="Enviar Pedido"
      >
        <form onSubmit={handleShipSubmit} className="space-y-4">
          <Input
            label="Código de Rastreio"
            value={shipForm.tracking_code}
            onChange={(e) => setShipForm({ ...shipForm, tracking_code: e.target.value })}
            placeholder="Ex: BR123456789BR"
          />
          <Input
            label="Transportadora"
            value={shipForm.carrier}
            onChange={(e) => setShipForm({ ...shipForm, carrier: e.target.value })}
            placeholder="Ex: Correios, Jadlog..."
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActionModal(null);
                setSelectedOrder(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Confirmar Envio
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={actionModal === 'payment'}
        onClose={() => {
          setActionModal(null);
          setSelectedOrder(null);
        }}
        title="Confirmar Pagamento"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <Input
            label="Referência do Pagamento"
            value={paymentForm.payment_reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
            placeholder="Ex: PIX, Transferência..."
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActionModal(null);
                setSelectedOrder(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Confirmar Pagamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={actionModal === 'cancel'}
        onClose={() => {
          setActionModal(null);
          setSelectedOrder(null);
        }}
        title="Cancelar Pedido"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <Input
            label="Motivo do Cancelamento"
            value={cancelForm.reason}
            onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
            placeholder="Informe o motivo..."
            required
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActionModal(null);
                setSelectedOrder(null);
              }}
            >
              Voltar
            </Button>
            <Button type="submit" variant="danger" isLoading={isUpdating}>
              Confirmar Cancelamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrdersPage;
