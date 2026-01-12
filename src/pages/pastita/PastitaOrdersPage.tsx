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
  Filter,
  Download,
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
  falhou: { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
  processando: { label: 'Processando', color: 'bg-blue-100 text-blue-800', icon: <CreditCard className="w-4 h-4" /> },
};

interface OrderDetailModalProps {
  pedido: Pedido;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ pedido, onClose, onStatusChange }) => {
  const status = statusConfig[pedido.status] || statusConfig.pendente;

  const handleWhatsApp = () => {
    const phone = pedido.cliente_telefone?.replace(/\D/g, '');
    if (phone) {
      const message = encodeURIComponent(
        `Olá! Seu pedido #${pedido.id} está ${status.label.toLowerCase()}. Obrigado por escolher a Pastita!`
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
              <h3 className="text-lg font-semibold">Pedido #{pedido.id}</h3>
              <p className="text-sm text-gray-500">
                {new Date(pedido.criado_em).toLocaleString('pt-BR')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cliente */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium">{pedido.cliente_nome}</p>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {pedido.cliente_telefone}
              </p>
              {pedido.cliente_email && (
                <p className="text-sm text-gray-600">{pedido.cliente_email}</p>
              )}
            </div>
          </div>

          {/* Endereço */}
          {pedido.endereco_entrega && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Endereço de Entrega</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span>
                    {pedido.endereco_entrega.rua}, {pedido.endereco_entrega.numero}
                    {pedido.endereco_entrega.complemento && ` - ${pedido.endereco_entrega.complemento}`}
                    <br />
                    {pedido.endereco_entrega.bairro} - {pedido.endereco_entrega.cidade}/{pedido.endereco_entrega.estado}
                    <br />
                    CEP: {pedido.endereco_entrega.cep}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Itens */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Itens do Pedido</h4>
            <div className="bg-gray-50 rounded-lg divide-y">
              {pedido.itens?.map((item, index) => (
                <div key={index} className="p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{item.produto_info?.nome || `Produto #${item.produto}`}</p>
                    <p className="text-sm text-gray-500">Qtd: {item.quantidade}</p>
                  </div>
                  <p className="font-medium">R$ {Number(item.subtotal || 0).toFixed(2)}</p>
                </div>
              ))}
              {pedido.itens_combo?.map((item, index) => (
                <div key={`combo-${index}`} className="p-4 flex justify-between bg-green-50">
                  <div>
                    <p className="font-medium">{item.combo_info?.nome || `Combo #${item.combo}`}</p>
                    <p className="text-sm text-gray-500">Qtd: {item.quantidade} (Combo)</p>
                  </div>
                  <p className="font-medium">R$ {Number(item.subtotal || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>R$ {Number(pedido.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(pedido.taxa_entrega) > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span>Taxa de Entrega</span>
                <span>R$ {Number(pedido.taxa_entrega).toFixed(2)}</span>
              </div>
            )}
            {Number(pedido.desconto) > 0 && (
              <div className="flex justify-between text-sm mt-1 text-green-600">
                <span>Desconto</span>
                <span>-R$ {Number(pedido.desconto).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
              <span>Total</span>
              <span>R$ {Number(pedido.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Observações</h4>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm">{pedido.observacoes}</p>
              </div>
            </div>
          )}

          {/* Ações de Status */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Alterar Status</h4>
            <div className="flex flex-wrap gap-2">
              {['aprovado', 'preparando', 'enviado', 'entregue', 'cancelado'].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(pedido.id, s)}
                  disabled={pedido.status === s}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    pedido.status === s
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : statusConfig[s]?.color || 'bg-gray-100'
                  }`}
                >
                  {statusConfig[s]?.label || s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-between">
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
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
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateRange.start) {
        params.data_inicio = dateRange.start;
      }
      if (dateRange.end) {
        params.data_fim = dateRange.end;
      }
      const data = await getPedidos(params);
      setPedidos(data);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
      logger.error('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleStatusChange = async (id: number, newStatus: string) => {
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
      logger.error('Failed to update order status', error);
    }
  };

  const filteredPedidos = pedidos.filter((pedido) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        pedido.cliente_nome?.toLowerCase().includes(search) ||
        pedido.cliente_telefone?.includes(search) ||
        pedido.id.toString().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: pedidos.length,
    pendentes: pedidos.filter((p) => p.status === 'pendente').length,
    aprovados: pedidos.filter((p) => p.status === 'aprovado').length,
    preparando: pedidos.filter((p) => p.status === 'preparando').length,
    enviados: pedidos.filter((p) => p.status === 'enviado').length,
    entregues: pedidos.filter((p) => p.status === 'entregue').length,
    faturamento: pedidos
      .filter((p) => ['aprovado', 'preparando', 'enviado', 'entregue'].includes(p.status))
      .reduce((sum, p) => sum + p.total, 0),
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos Pastita</h1>
          <p className="text-gray-600">Gerencie os pedidos da Pastita Massas Artesanais</p>
        </div>
        <button
          onClick={fetchPedidos}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <p className="text-sm text-yellow-600">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pendentes}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <p className="text-sm text-blue-600">Aprovados</p>
          <p className="text-2xl font-bold text-blue-700">{stats.aprovados}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <p className="text-sm text-purple-600">Preparando</p>
          <p className="text-2xl font-bold text-purple-700">{stats.preparando}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow p-4">
          <p className="text-sm text-indigo-600">Enviados</p>
          <p className="text-2xl font-bold text-indigo-700">{stats.enviados}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-sm text-green-600">Entregues</p>
          <p className="text-2xl font-bold text-green-700">{stats.entregues}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg shadow p-4">
          <p className="text-sm text-emerald-600">Faturamento</p>
          <p className="text-xl font-bold text-emerald-700">R$ {Number(stats.faturamento || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="preparando">Preparando</option>
              <option value="enviado">Enviado</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Package className="w-12 h-12 mb-2" />
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPedidos.map((pedido) => {
                const status = statusConfig[pedido.status] || statusConfig.pendente;
                return (
                  <tr key={pedido.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">#{pedido.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{pedido.cliente_nome}</p>
                        <p className="text-sm text-gray-500">{pedido.cliente_telefone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">
                        R$ {Number(pedido.total).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedPedido(pedido)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Modal */}
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
