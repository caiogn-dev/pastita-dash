import React, { useEffect, useState, useMemo } from 'react';
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
  ORDER_STATUS_CONFIG,
} from '../../components/common';
import { ordersService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { Order } from '../../types';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, selectedAccount } = useAccountStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [shipModal, setShipModal] = useState<Order | null>(null);
  const [paymentModal, setPaymentModal] = useState<Order | null>(null);
  const [cancelModal, setCancelModal] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderForm, setOrderForm] = useState({
    account_id: '',
    customer_phone: '',
    customer_name: '',
    customer_email: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
  });
  const [shipForm, setShipForm] = useState({
    tracking_code: '',
    carrier: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_reference: '',
  });
  const [cancelForm, setCancelForm] = useState({
    reason: '',
  });

  useEffect(() => {
    loadOrders();
  }, [selectedAccount]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedAccount) {
        params.account = selectedAccount.id;
      }
      const response = await ordersService.getOrders(params);
      setOrders(response.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = orders;
    
    if (statusFilter) {
      result = result.filter((order) => order.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((order) =>
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone.includes(query) ||
        order.customer_email?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [orders, statusFilter, searchQuery]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await ordersService.createOrder({
        account_id: orderForm.account_id,
        customer_phone: orderForm.customer_phone,
        customer_name: orderForm.customer_name,
        customer_email: orderForm.customer_email,
        items: [
          {
            product_name: orderForm.product_name,
            quantity: orderForm.quantity,
            unit_price: orderForm.unit_price,
          },
        ],
      });
      toast.success('Pedido criado com sucesso!');
      setCreateModal(false);
      setOrderForm({
        account_id: '',
        customer_phone: '',
        customer_name: '',
        customer_email: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
      });
      loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusAction = async (order: Order, action: string) => {
    try {
      let updated: Order;
      switch (action) {
        case 'confirm':
          updated = await ordersService.confirmOrder(order.id);
          break;
        case 'awaiting_payment':
          updated = await ordersService.markAwaitingPayment(order.id);
          break;
        case 'deliver':
          updated = await ordersService.deliverOrder(order.id);
          break;
        default:
          return;
      }
      setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipModal) return;
    setIsUpdating(true);
    try {
      const updated = await ordersService.shipOrder(
        shipModal.id,
        shipForm.tracking_code,
        shipForm.carrier
      );
      setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
      toast.success('Pedido marcado como enviado!');
      setShipModal(null);
      setShipForm({ tracking_code: '', carrier: '' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setIsUpdating(true);
    try {
      const updated = await ordersService.markPaid(
        paymentModal.id,
        paymentForm.payment_reference
      );
      setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
      toast.success('Pagamento confirmado!');
      setPaymentModal(null);
      setPaymentForm({ payment_reference: '' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModal) return;
    setIsUpdating(true);
    try {
      const updated = await ordersService.cancelOrder(
        cancelModal.id,
        cancelForm.reason
      );
      setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
      toast.success('Pedido cancelado!');
      setCancelModal(null);
      setCancelForm({ reason: '' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextActions = (order: Order): Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger'; icon?: React.ReactNode }> => {
    const actions: Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger'; icon?: React.ReactNode }> = [];
    
    switch (order.status) {
      case 'pending':
        actions.push({ action: 'confirm', label: 'Confirmar', variant: 'primary' });
        break;
      case 'confirmed':
        actions.push({ action: 'awaiting_payment', label: 'Aguardar Pagamento', variant: 'secondary' });
        break;
      case 'awaiting_payment':
        actions.push({ action: 'mark_paid', label: 'Confirmar Pagamento', variant: 'primary', icon: <CreditCardIcon className="w-4 h-4" /> });
        break;
      case 'paid':
        actions.push({ action: 'ship', label: 'Enviar', variant: 'primary', icon: <TruckIcon className="w-4 h-4" /> });
        break;
      case 'shipped':
        actions.push({ action: 'deliver', label: 'Confirmar Entrega', variant: 'primary' });
        break;
    }
    
    if (!['cancelled', 'delivered', 'refunded'].includes(order.status)) {
      actions.push({ action: 'cancel', label: 'Cancelar', variant: 'danger', icon: <XMarkIcon className="w-4 h-4" /> });
    }
    
    return actions;
  };

  const handleAction = (order: Order, action: string) => {
    switch (action) {
      case 'mark_paid':
        setPaymentModal(order);
        break;
      case 'ship':
        setShipModal(order);
        break;
      case 'cancel':
        setCancelModal(order);
        break;
      default:
        handleStatusAction(order, action);
    }
  };

  const columns = [
    {
      key: 'order_number',
      header: 'Pedido',
      render: (order: Order) => (
        <div>
          <p className="font-semibold text-gray-900">#{order.order_number}</p>
          <p className="text-sm text-gray-500">
            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (order: Order) => (
        <div>
          <p className="font-medium text-gray-900">{order.customer_name || '-'}</p>
          <p className="text-sm text-gray-500">{order.customer_phone}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Itens',
      render: (order: Order) => (
        <div>
          <span className="text-sm font-medium text-gray-900">
            {order.items?.length || 0} item(ns)
          </span>
          {order.items && order.items.length > 0 && (
            <p className="text-xs text-gray-500 truncate max-w-[150px]">
              {order.items[0].product_name}
              {order.items.length > 1 && ` +${order.items.length - 1}`}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order: Order) => (
        <span className="font-semibold text-gray-900">
          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: Order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (order: Order) => {
        const actions = getNextActions(order);
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
        subtitle={`${filteredOrders.length} de ${orders.length} pedido(s)`}
        actions={
          <Button
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => setCreateModal(true)}
          >
            Novo Pedido
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Status Tabs */}
        <OrderStatusTabs
          value={statusFilter}
          onChange={setStatusFilter}
          counts={statusCounts}
        />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, telefone ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {(statusFilter || searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter(null);
                setSearchQuery('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(ORDER_STATUS_CONFIG).slice(0, 6).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === key
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{statusCounts[key] || 0}</p>
              <p className="text-sm text-gray-600">{config.label}</p>
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <Card noPadding>
          <Table
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            onRowClick={(order) => navigate(`/orders/${order.id}`)}
            emptyMessage={
              statusFilter || searchQuery
                ? "Nenhum pedido encontrado com os filtros aplicados"
                : "Nenhum pedido encontrado"
            }
          />
        </Card>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Novo Pedido"
        size="md"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <Select
            label="Conta WhatsApp"
            required
            value={orderForm.account_id}
            onChange={(e) => setOrderForm({ ...orderForm, account_id: e.target.value })}
            options={[
              { value: '', label: 'Selecione uma conta' },
              ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
            ]}
          />
          <Input
            label="Telefone do Cliente"
            required
            value={orderForm.customer_phone}
            onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
            placeholder="5511999999999"
          />
          <Input
            label="Nome do Cliente"
            value={orderForm.customer_name}
            onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
            placeholder="Nome completo"
          />
          <Input
            label="Email do Cliente"
            type="email"
            value={orderForm.customer_email}
            onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })}
            placeholder="email@exemplo.com"
          />
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Item do Pedido</h4>
            <div className="space-y-3">
              <Input
                label="Nome do Produto"
                required
                value={orderForm.product_name}
                onChange={(e) => setOrderForm({ ...orderForm, product_name: e.target.value })}
                placeholder="Nome do produto"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Quantidade"
                  type="number"
                  min={1}
                  required
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) })}
                />
                <Input
                  label="Preço Unitário"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={orderForm.unit_price}
                  onChange={(e) => setOrderForm({ ...orderForm, unit_price: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Criar Pedido
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ship Order Modal */}
      <Modal
        isOpen={!!shipModal}
        onClose={() => setShipModal(null)}
        title="Enviar Pedido"
        size="sm"
      >
        <form onSubmit={handleShipOrder} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Pedido</p>
            <p className="font-semibold text-gray-900">#{shipModal?.order_number}</p>
            <p className="text-sm text-gray-600 mt-1">{shipModal?.customer_name}</p>
          </div>
          <Input
            label="Código de Rastreio"
            value={shipForm.tracking_code}
            onChange={(e) => setShipForm({ ...shipForm, tracking_code: e.target.value })}
            placeholder="Ex: BR123456789BR"
          />
          <Select
            label="Transportadora"
            value={shipForm.carrier}
            onChange={(e) => setShipForm({ ...shipForm, carrier: e.target.value })}
            options={[
              { value: '', label: 'Selecione uma transportadora' },
              { value: 'correios', label: 'Correios' },
              { value: 'jadlog', label: 'Jadlog' },
              { value: 'sedex', label: 'Sedex' },
              { value: 'pac', label: 'PAC' },
              { value: 'transportadora', label: 'Transportadora Própria' },
              { value: 'motoboy', label: 'Motoboy' },
              { value: 'outro', label: 'Outro' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShipModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdating} leftIcon={<TruckIcon className="w-4 h-4" />}>
              Confirmar Envio
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Confirmar Pagamento"
        size="sm"
      >
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-600">Valor a confirmar</p>
            <p className="text-2xl font-bold text-green-700">
              R$ {paymentModal?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-green-600 mt-1">Pedido #{paymentModal?.order_number}</p>
          </div>
          <Input
            label="Referência do Pagamento"
            value={paymentForm.payment_reference}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
            placeholder="Ex: PIX, Cartão, Boleto..."
            helperText="Opcional: ID da transação ou método de pagamento"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setPaymentModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdating} leftIcon={<CreditCardIcon className="w-4 h-4" />}>
              Confirmar Pagamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancelar Pedido"
        size="sm"
      >
        <form onSubmit={handleCancelOrder} className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-600">Atenção!</p>
            <p className="font-medium text-red-700">
              Você está prestes a cancelar o pedido #{cancelModal?.order_number}
            </p>
            <p className="text-sm text-red-600 mt-1">Esta ação não pode ser desfeita.</p>
          </div>
          <Input
            label="Motivo do Cancelamento"
            value={cancelForm.reason}
            onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
            placeholder="Informe o motivo do cancelamento"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setCancelModal(null)}>
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
