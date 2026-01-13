/**
 * Payments Page - Shows payment information from Pastita orders
 * Uses the unified stores API to fetch orders with payment data
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import { Header } from '../../components/layout';
import {
  Card,
  Button,
  Table,
  PageLoading,
  StatusFilter,
} from '../../components/common';
import { getPedidos, updatePedidoStatus, type Pedido } from '../../services/pastitaApi';
import logger from '../../services/logger';

// Payment status options based on StoreOrder.PaymentStatus
const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Aguardando', color: 'warning' },
  { value: 'processing', label: 'Processando', color: 'purple' },
  { value: 'paid', label: 'Pago', color: 'success' },
  { value: 'failed', label: 'Falhou', color: 'danger' },
  { value: 'refunded', label: 'Reembolsado', color: 'gray' },
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
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <ClockIcon className="w-4 h-4" /> },
    processing: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <ArrowPathIcon className="w-4 h-4 animate-spin" /> },
    paid: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircleIcon className="w-4 h-4" /> },
    failed: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircleIcon className="w-4 h-4" /> },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <ArrowPathIcon className="w-4 h-4" /> },
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
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all orders from Pastita store, ordered by most recent
      const ordersData = await getPedidos({ ordering: '-created_at' });
      setOrders(ordersData);
    } catch (error) {
      logger.error('Error loading payments:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle confirm payment (mark as paid)
  const handleConfirmPayment = async (order: Pedido) => {
    try {
      await updatePedidoStatus(order.id, 'paid');
      setOrders(orders.map(o => 
        o.id === order.id 
          ? { ...o, payment_status: 'paid', status_pagamento: 'paid' } 
          : o
      ));
      toast.success(`Pagamento do pedido #${order.order_number} confirmado!`);
    } catch (error) {
      logger.error('Error confirming payment:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    const pendingAmount = orders
      .filter(o => o.payment_status === 'pending')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    });
    
    const todayRevenue = todayOrders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    return {
      totalRevenue,
      pendingAmount,
      todayRevenue,
      todayCount: todayOrders.length,
      paidCount: orders.filter(o => o.payment_status === 'paid').length,
      pendingCount: orders.filter(o => o.payment_status === 'pending').length,
    };
  }, [orders]);

  // Count by payment status
  const paymentStatusCounts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      const status = order.payment_status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  // Filter orders by payment status
  const filteredOrders = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter(order => order.payment_status === statusFilter);
  }, [orders, statusFilter]);

  // Filter options with counts
  const filterOptions = useMemo(() => {
    return PAYMENT_STATUS_OPTIONS.map(option => ({
      ...option,
      count: paymentStatusCounts[option.value] || 0,
    }));
  }, [paymentStatusCounts]);

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
      render: (order: Pedido) => (
        <div>
          <span className="font-semibold text-gray-900">#{order.order_number}</span>
          <p className="text-xs text-gray-500">{order.customer_name || order.cliente_nome}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Valor',
      render: (order: Pedido) => (
        <span className="font-semibold text-gray-900">{formatMoney(order.total)}</span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Método',
      render: (order: Pedido) => {
        const orderAny = order as unknown as Record<string, unknown>;
        const method = (orderAny.payment_method as string) || 'pix';
        const methodInfo = PAYMENT_METHOD_LABELS[method] || { label: method, icon: <CurrencyDollarIcon className="w-4 h-4" /> };
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            {methodInfo.icon}
            {methodInfo.label}
          </span>
        );
      },
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (order: Pedido) => (
        <PaymentStatusBadge status={order.payment_status || 'pending'} />
      ),
    },
    {
      key: 'payment_link',
      header: 'Link Pagamento',
      render: (order: Pedido) => {
        const orderAny = order as unknown as Record<string, unknown>;
        const paymentMethod = orderAny.payment_method as string;
        const pixCode = orderAny.pix_code as string;
        const orderNumber = order.order_number;
        
        // PIX ticket URL from Mercado Pago
        const pixTicketUrl = orderAny.pix_ticket_url as string;
        
        // Check for direct payment link (for card payments)
        const directLink = (orderAny.payment_url as string) || 
                          (orderAny.payment_link as string) || 
                          (orderAny.init_point as string);
        
        // Generate link from payment_preference_id if available (for card payments)
        const preferenceId = orderAny.payment_preference_id as string;
        const preferenceLink = preferenceId 
          ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`
          : null;
        
        // For PIX payments with pix_code, generate link to payment page on client site
        // This page shows the QR code and PIX code together
        const clientPaymentLink = pixCode && orderNumber
          ? `https://pastita.delivery/pendente?order=${orderNumber}`
          : null;
        
        // Priority: pix_ticket_url > client payment page > direct link > preference link
        const paymentLink = pixTicketUrl || clientPaymentLink || directLink || preferenceLink;
        
        // Show link if available
        if (paymentLink) {
          return (
            <div className="flex items-center gap-2">
              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="w-4 h-4" />
                Abrir
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(paymentLink);
                  toast.success('Link copiado! Envie para o cliente.');
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Copiar link"
              >
                <ClipboardIcon className="w-4 h-4" />
              </button>
            </div>
          );
        }
        
        // If payment method is cash, no link needed
        if (paymentMethod === 'cash') {
          return <span className="text-sm text-gray-500">💵 Dinheiro</span>;
        }
        
        // No payment info yet
        return <span className="text-sm text-gray-400">-</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (order: Pedido) => (
        <div className="text-sm">
          <p className="text-gray-900">{format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p className="text-gray-500">{format(new Date(order.created_at), "HH:mm", { locale: ptBR })}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (order: Pedido) => (
        <div className="flex items-center gap-2">
          {order.payment_status === 'pending' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmPayment(order);
              }}
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Confirmar
            </Button>
          )}
          {order.payment_status === 'paid' && (
            <span className="text-sm text-green-600 font-medium">✓ Pago</span>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <Header
        title="Pagamentos"
        subtitle={`${orders.length} pedido(s) | ${formatMoney(stats.totalRevenue)} recebido`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Receita Hoje</p>
                <p className="text-xl font-bold text-gray-900">{formatMoney(stats.todayRevenue)}</p>
                <p className="text-xs text-gray-500">{stats.todayCount} pedido(s)</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Recebido</p>
                <p className="text-xl font-bold text-gray-900">{formatMoney(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">{stats.paidCount} pago(s)</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aguardando</p>
                <p className="text-xl font-bold text-gray-900">{formatMoney(stats.pendingAmount)}</p>
                <p className="text-xs text-gray-500">{stats.pendingCount} pendente(s)</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BanknotesIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pedidos</p>
                <p className="text-xl font-bold text-gray-900">{orders.length}</p>
                <p className="text-xs text-gray-500">todos os tempos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusFilter
            options={filterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            className="flex-wrap"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* Payments Table */}
        <Card noPadding>
          <Table
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            emptyMessage="Nenhum pagamento encontrado"
          />
        </Card>
      </div>
    </div>
  );
};

export default PaymentsPage;
