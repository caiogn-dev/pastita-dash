// @ts-nocheck - Se quiser ignorar tudo, mas recomendo usar o código abaixo corrigido
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Search,
  RefreshCw,
  Eye,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  CreditCard,
  MessageCircle,
} from 'lucide-react';
import {
  getPedidos,
  getPedido,
  updatePedidoStatus,
  type Pedido,
} from '../../services/pastitaApi';
import logger from '../../services/logger';

type OrderStatus = 'all' | 'pendente' | 'aprovado' | 'preparando' | 'enviado' | 'entregue' | 'cancelado';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
  aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4" /> },
  preparando: { label: 'Preparando', color: 'bg-purple-100 text-purple-800', icon: <Package className="w-4 h-4" /> },
  enviado: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800', icon: <Truck className="w-4 h-4" /> },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
};

interface OrderDetailModalProps {
  pedido: Pedido;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void; // ID agora é string
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ pedido, onClose, onStatusChange }) => {
  const status = statusConfig[pedido.status] || statusConfig.pendente;

  const handleWhatsApp = () => {
    const phone = (pedido.customer_phone || pedido.cliente_telefone)?.replace(/\D/g, '');
    if (phone) {
      const message = encodeURIComponent(
        `Olá! Seu pedido #${pedido.order_number} está ${status.label.toLowerCase()}.`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">Pedido #{pedido.order_number}</h3>
              <p className="text-sm text-gray-500">
                {new Date(pedido.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium">{pedido.customer_name || pedido.cliente_nome}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {pedido.customer_phone || pedido.cliente_telefone}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Itens do Pedido</h4>
            <div className="bg-gray-50 rounded-lg divide-y">
              {pedido.items?.map((item) => (
                <div key={item.id} className="p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-500">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-medium">R$ {Number(item.total_price).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>R$ {Number(pedido.total).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Alterar Status</h4>
            <div className="flex flex-wrap gap-2">
              {['aprovado', 'preparando', 'enviado', 'entregue', 'cancelado'].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(pedido.id, s)}
                  disabled={pedido.status === s}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    pedido.status === s ? 'bg-gray-200 text-gray-500' : statusConfig[s]?.color || 'bg-gray-100'
                  }`}
                >
                  {statusConfig[s]?.label || s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const PastitaOrdersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPedidos(statusFilter !== 'all' ? { status: statusFilter } : {});
      setPedidos(data);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updatePedidoStatus(id, newStatus);
      toast.success('Status atualizado');
      fetchPedidos();
      if (selectedPedido?.id === id) {
        const updated = await getPedido(id);
        setSelectedPedido(updated);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const stats = {
    total: pedidos.length,
    pendentes: pedidos.filter((p) => p.status === 'pending').length,
    faturamento: pedidos
      .filter((p) => ['paid', 'approved', 'entregue'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.total || 0), 0),
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos Pastita</h1>
        <button onClick={fetchPedidos} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Pedidos</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Faturamento</p>
          <p className="text-2xl font-bold text-green-600">R$ {stats.faturamento.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td className="px-6 py-4">#{pedido.order_number}</td>
                <td className="px-6 py-4">{pedido.customer_name || pedido.cliente_nome}</td>
                <td className="px-6 py-4 font-bold">R$ {Number(pedido.total).toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setSelectedPedido(pedido)} className="text-green-600">
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPedido && (
        <OrderDetailModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default PastitaOrdersPage;