import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  CubeIcon,
  CreditCardIcon,
  ChatBubbleLeftIcon,
  FunnelIcon,
  BellAlertIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  PrinterIcon,
  Cog6ToothIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { storeApi, type Order } from '../../services/storeApi';

// Type alias for backwards compatibility
type Pedido = Order;
import { useOrdersWebSocket, useNotificationSound } from '../../hooks';
import { useOrderPrint, getAutoPrintEnabled, setAutoPrintEnabled, AUTO_PRINT_KEY } from '../../components/orders/OrderPrint';
import logger from '../../services/logger';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
type PaymentStatus = 'all' | 'pending' | 'paid' | 'failed' | 'refunded';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <ClockIcon className="w-4 h-4" /> },
  confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <CheckCircleIcon className="w-4 h-4" /> },
  preparing: { label: 'Preparando', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: <CubeIcon className="w-4 h-4" /> },
  ready: { label: 'Pronto', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <CheckCircleSolidIcon className="w-4 h-4" /> },
  delivering: { label: 'Em Entrega', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200', icon: <TruckIcon className="w-4 h-4" /> },
  delivered: { label: 'Entregue', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: <CheckCircleSolidIcon className="w-4 h-4" /> },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <XCircleIcon className="w-4 h-4" /> },
};

const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Aguardando', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  paid: { label: 'Pago', color: 'text-green-700', bgColor: 'bg-green-50' },
  failed: { label: 'Falhou', color: 'text-red-700', bgColor: 'bg-red-50' },
  refunded: { label: 'Reembolsado', color: 'text-gray-700', bgColor: 'bg-gray-50' },
};

interface OrderDetailModalProps {
  pedido: Pedido;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onPrint: (pedido: Pedido) => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ pedido, onClose, onStatusChange, onPrint }) => {
  const status = statusConfig[pedido.status] || statusConfig.pending;
  const paymentStatus = paymentStatusConfig[pedido.payment_status] || paymentStatusConfig.pending;

  const handleWhatsApp = () => {
    const phone = (pedido.customer_phone || pedido.cliente_telefone)?.replace(/\D/g, '');
    if (phone) {
      const message = encodeURIComponent(
        `Olá! Seu pedido #${pedido.order_number} está ${status.label.toLowerCase()}.`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  const handlePrint = () => {
    onPrint(pedido);
  };

  const formatAddress = () => {
    const addr = pedido.endereco_entrega || pedido.delivery_address;
    if (!addr || typeof addr !== 'object') return null;
    const addrAny = addr as unknown as Record<string, string>;
    const parts = [
      addrAny.rua || addrAny.street,
      addrAny.numero || addrAny.number,
      addrAny.complemento || addrAny.complement,
      addrAny.bairro || addrAny.neighborhood,
      addrAny.cidade || addrAny.city,
      addrAny.estado || addrAny.state,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const statusFlow = ['confirmed', 'preparing', 'ready', 'delivering', 'delivered'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">Pedido</p>
              <h3 className="text-2xl font-bold">#{pedido.order_number}</h3>
              <p className="text-green-100 text-sm mt-1">
                {new Date(pedido.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 border ${status.bgColor} ${status.color}`}>
                {status.icon}
                {status.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatus.bgColor} ${paymentStatus.color}`}>
                💳 {paymentStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Customer Info */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-3.5 h-3.5 text-green-600" />
                </span>
                Cliente
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">{pedido.customer_name || pedido.cliente_nome}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  {pedido.customer_phone || pedido.cliente_telefone}
                </p>
                {pedido.customer_email && (
                  <p className="text-sm text-gray-600">{pedido.customer_email}</p>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {formatAddress() && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPinIcon className="w-3.5 h-3.5 text-blue-600" />
                  </span>
                  Endereço de Entrega
                </h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700">{formatAddress()}</p>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className="w-3.5 h-3.5 text-purple-600" />
                </span>
                Itens do Pedido
              </h4>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                {pedido.items?.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Qtd: {item.quantity} × R$ {Number(item.unit_price).toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">R$ {Number(item.total_price || (item.quantity * Number(item.unit_price))).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>R$ {Number(pedido.subtotal || pedido.total).toFixed(2)}</span>
              </div>
              {Number(pedido.delivery_fee || pedido.taxa_entrega || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Taxa de Entrega</span>
                  <span>R$ {Number(pedido.delivery_fee || pedido.taxa_entrega).toFixed(2)}</span>
                </div>
              )}
              {Number(pedido.discount || pedido.desconto || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-R$ {Number(pedido.discount || pedido.desconto).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-green-600">R$ {Number(pedido.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Status Actions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Alterar Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusFlow.map((s) => {
                  const config = statusConfig[s];
                  const isActive = pedido.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => !isActive && onStatusChange(pedido.id, s)}
                      disabled={isActive}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        isActive 
                          ? 'bg-green-600 text-white shadow-md' 
                          : `${config.bgColor} ${config.color} hover:shadow-md border`
                      }`}
                    >
                      {config.icon}
                      {config.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => pedido.status !== 'cancelled' && onStatusChange(pedido.id, 'cancelled')}
                  disabled={pedido.status === 'cancelled'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    pedido.status === 'cancelled'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:shadow-md'
                  }`}
                >
                  <XCircleIcon className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <button 
            onClick={handlePrint} 
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
          >
            <PrinterIcon className="w-4 h-4" /> Imprimir
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleWhatsApp} 
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              <ChatBubbleLeftIcon className="w-4 h-4" /> WhatsApp
            </button>
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs ontem
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

export const PastitaOrdersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>('all');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabledState] = useState(getAutoPrintEnabled());
  const [showSettings, setShowSettings] = useState(false);
  
  // Print hook
  const { printOrder } = useOrderPrint();
  
  // Track printed orders to avoid duplicates
  const printedOrdersRef = useRef<Set<string>>(new Set());

  // Handle print
  const handlePrintOrder = useCallback((pedido: Pedido) => {
    printOrder(pedido);
    toast.success(`🖨️ Imprimindo pedido #${pedido.order_number}`, { duration: 2000 });
  }, [printOrder]);

  // Auto-print handler for paid orders
  const handleAutoPrint = useCallback(async (orderId: string) => {
    if (!autoPrintEnabled) return;
    
    // Check if already printed
    if (printedOrdersRef.current.has(orderId)) return;
    
    try {
      const order = await storeApi.getOrder(orderId);
      if (order.payment_status === 'paid') {
        printedOrdersRef.current.add(orderId);
        handlePrintOrder(order);
        toast.success(`🖨️ Impressão automática - Pedido #${order.order_number}`, { duration: 3000 });
      }
    } catch (error) {
      logger.error('Error auto-printing order:', error);
    }
  }, [autoPrintEnabled, handlePrintOrder]);

  // Toggle auto-print
  const toggleAutoPrint = useCallback(() => {
    const newValue = !autoPrintEnabled;
    setAutoPrintEnabledState(newValue);
    setAutoPrintEnabled(newValue);
    toast.success(newValue ? '🖨️ Impressão automática ativada' : '🖨️ Impressão automática desativada');
  }, [autoPrintEnabled]);

  // Notification sounds
  const { playOrderSound, playSuccessSound, stopAlert, isAlertActive } = useNotificationSound({ enabled: true });

  // Stop alert on click
  useEffect(() => {
    if (isAlertActive) {
      const stop = () => stopAlert();
      document.addEventListener('click', stop, { once: true });
      return () => document.removeEventListener('click', stop);
    }
  }, [isAlertActive, stopAlert]);

  // Debounced refresh - prevents rate limiting
  const refreshTimeoutRef = useRef<number | undefined>(undefined);
  const lastRefreshRef = useRef<number>(0);
  
  const scheduleRefresh = useCallback(() => {
    const now = Date.now();
    // Don't refresh more than once every 3 seconds
    if (now - lastRefreshRef.current < 3000) {
      console.log('[PastitaOrders] Skipping refresh - too soon');
      return;
    }
    
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = window.setTimeout(() => {
      lastRefreshRef.current = Date.now();
      fetchPedidos();
    }, 1000);
  }, [fetchPedidos]);

  // Real-time WebSocket connection
  const { isConnected, connectionError } = useOrdersWebSocket({
    onOrderCreated: (data) => {
      console.log('[PastitaOrders] New order:', data);
      playOrderSound();
      toast.success(`🎉 Novo pedido #${data.order_number || data.order_id}!`, {
        duration: 6000,
        icon: '🛒',
      });
      setNewOrderAlert(true);
      scheduleRefresh();
    },
    onOrderUpdated: (data) => {
      console.log('[PastitaOrders] Order updated:', data);
      scheduleRefresh();
    },
    onStatusChanged: (data) => {
      console.log('[PastitaOrders] Status changed:', data);
      toast(`Pedido #${data.order_number} → ${data.status}`, { icon: '📦' });
      scheduleRefresh();
    },
    onPaymentReceived: (data) => {
      console.log('[PastitaOrders] Payment received:', data);
      playSuccessSound();
      toast.success(`💰 Pagamento confirmado - #${data.order_number || data.order_id}!`, {
        duration: 6000,
      });
      scheduleRefresh();
      // Auto-print when payment is received
      if (data.order_id) {
        handleAutoPrint(data.order_id as string);
      }
    },
  });

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setNewOrderAlert(false);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentFilter !== 'all') params.payment_status = paymentFilter;
      
      const data = await storeApi.getOrders(params);
      setPedidos(data);
    } catch (error) {
      logger.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await storeApi.updateOrderStatus(id, newStatus as any);
      toast.success('Status atualizado com sucesso!');
      fetchPedidos();
      if (selectedPedido?.id === id) {
        const updated = await storeApi.getOrder(id);
        setSelectedPedido(updated);
      }
    } catch (error) {
      logger.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Filter orders by search term
  const filteredPedidos = useMemo(() => {
    if (!searchTerm.trim()) return pedidos;
    const term = searchTerm.toLowerCase();
    return pedidos.filter(p => 
      p.order_number?.toLowerCase().includes(term) ||
      (p.customer_name || p.cliente_nome)?.toLowerCase().includes(term) ||
      (p.customer_phone || p.cliente_telefone)?.includes(term)
    );
  }, [pedidos, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = pedidos.filter(p => new Date(p.created_at).toDateString() === today);
    const paidOrders = pedidos.filter(p => p.payment_status === 'paid');
    
    return {
      total: pedidos.length,
      today: todayOrders.length,
      pending: pedidos.filter(p => p.status === 'pending').length,
      preparing: pedidos.filter(p => ['confirmed', 'preparing'].includes(p.status)).length,
      revenue: paidOrders.reduce((sum, p) => sum + Number(p.total || 0), 0),
      revenueToday: todayOrders.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.total || 0), 0),
    };
  }, [pedidos]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <ShoppingBagIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pedidos Pastita</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-gray-500">{isConnected ? 'Conectado em tempo real' : 'Desconectado'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {newOrderAlert && (
                <button 
                  onClick={fetchPedidos}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl animate-pulse"
                >
                  <BellAlertIcon className="w-5 h-5" />
                  Novos pedidos!
                </button>
              )}
              {/* Auto-print toggle */}
              <button 
                onClick={toggleAutoPrint}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  autoPrintEnabled 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoPrintEnabled ? 'Impressão automática ativada' : 'Impressão automática desativada'}
              >
                <PrinterIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button 
                onClick={fetchPedidos} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total de Pedidos"
            value={stats.total}
            icon={<ShoppingBagIcon className="w-5 h-5 text-blue-600" />}
            color="text-blue-600"
          />
          <StatCard
            title="Pedidos Hoje"
            value={stats.today}
            icon={<ClockIcon className="w-5 h-5 text-purple-600" />}
            color="text-purple-600"
          />
          <StatCard
            title="Pendentes"
            value={stats.pending}
            icon={<ClockIcon className="w-5 h-5 text-amber-600" />}
            color="text-amber-600"
          />
          <StatCard
            title="Em Preparo"
            value={stats.preparing}
            icon={<CubeIcon className="w-5 h-5 text-indigo-600" />}
            color="text-indigo-600"
          />
          <StatCard
            title="Faturamento Total"
            value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<CurrencyDollarIcon className="w-5 h-5 text-green-600" />}
            color="text-green-600"
          />
          <StatCard
            title="Faturamento Hoje"
            value={`R$ ${stats.revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />}
            color="text-emerald-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por número, cliente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
              >
                <option value="all">Todos os Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-gray-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
              >
                <option value="all">Todos Pagamentos</option>
                {Object.entries(paymentStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando pedidos...</p>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBagIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagamento</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPedidos.map((pedido) => {
                    const status = statusConfig[pedido.status] || statusConfig.pending;
                    const payment = paymentStatusConfig[pedido.payment_status] || paymentStatusConfig.pending;
                    
                    return (
                      <tr 
                        key={pedido.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPedido(pedido)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">#{pedido.order_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{pedido.customer_name || pedido.cliente_nome}</p>
                            <p className="text-sm text-gray-500">{pedido.customer_phone || pedido.cliente_telefone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${payment.bgColor} ${payment.color}`}>
                            {payment.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">R$ {Number(pedido.total).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedPedido(pedido); }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedPedido && (
        <OrderDetailModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onStatusChange={handleStatusChange}
          onPrint={handlePrintOrder}
        />
      )}
    </div>
  );
};

export default PastitaOrdersPage;