import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, TruckIcon, CreditCardIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
import { exportService, getErrorMessage } from '../../services';
import { unifiedApi, UnifiedOrder, UnifiedOrderFilters } from '../../services/unifiedApi';
import { useStoreContextStore } from '../../stores';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStoreContextStore();
  
  // State
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [actionModal, setActionModal] = useState<'ship' | 'payment' | 'cancel' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form states
  const [shipForm, setShipForm] = useState({ tracking_code: '', carrier: '' });
  const [paymentForm, setPaymentForm] = useState({ payment_reference: '' });
  const [cancelForm, setCancelForm] = useState({ reason: '' });

  // Load orders from unified API
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: UnifiedOrderFilters = {
        store: selectedStore?.id,
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
  }, [selectedStore?.id, statusFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <Header
        title="Pedidos"
        subtitle={`${filteredOrders.length} pedido(s)${selectedStore ? ` - ${selectedStore.name}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
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

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Status Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <OrderStatusTabs
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
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
