import React, { useEffect, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  InboxIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Header } from '../../components/layout';
import { Card, StatCard, PageLoading } from '../../components/common';
import { dashboardService } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { DashboardOverview, DashboardCharts } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardPage: React.FC = () => {
  const { selectedAccount } = useAccountStore();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedAccount]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, chartsData] = await Promise.all([
        dashboardService.getOverview(selectedAccount?.id),
        dashboardService.getCharts(selectedAccount?.id, 7),
      ]);
      setOverview(overviewData);
      setCharts(chartsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  const messagesChartData = {
    labels: charts?.messages_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Recebidas',
        data: charts?.messages_per_day.map((d) => d.inbound) || [],
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Enviadas',
        data: charts?.messages_per_day.map((d) => d.outbound) || [],
        borderColor: '#128C7E',
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const orderStatusData = {
    labels: Object.keys(charts?.order_statuses || {}),
    datasets: [
      {
        data: Object.values(charts?.order_statuses || {}),
        backgroundColor: [
          '#FCD34D',
          '#60A5FA',
          '#F97316',
          '#A78BFA',
          '#34D399',
          '#F472B6',
          '#EF4444',
          '#6B7280',
        ],
      },
    ],
  };

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Última atualização: ${overview?.timestamp ? format(new Date(overview.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Mensagens Hoje"
            value={overview?.messages.today || 0}
            icon={<InboxIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Conversas Ativas"
            value={overview?.conversations.active || 0}
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Pedidos Hoje"
            value={overview?.orders.today || 0}
            icon={<ShoppingCartIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Receita Hoje"
            value={`R$ ${(overview?.orders.revenue_today || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Interações LLM"
            value={overview?.langflow.interactions_today || 0}
            icon={<CpuChipIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Contas Ativas"
            value={overview?.accounts.active || 0}
            icon={<UserGroupIcon className="w-6 h-6" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Chart */}
          <Card title="Mensagens (7 dias)" className="lg:col-span-2">
            <div className="h-80">
              <Line
                data={messagesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </Card>

          {/* Order Status Chart */}
          <Card title="Status dos Pedidos">
            <div className="h-80 flex items-center justify-center">
              <Doughnut
                data={orderStatusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </Card>
        </div>

        {/* Details Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages by Status */}
          <Card title="Mensagens por Status">
            <div className="space-y-3">
              {Object.entries(overview?.messages.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{status}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Conversations by Mode */}
          <Card title="Conversas por Modo">
            <div className="space-y-3">
              {Object.entries(overview?.conversations.by_mode || {}).map(([mode, count]) => (
                <div key={mode} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {mode === 'auto' ? 'Automático' : mode === 'human' ? 'Humano' : 'Híbrido'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Langflow Stats */}
          <Card title="Estatísticas Langflow">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Interações Hoje</span>
                <span className="text-sm font-medium text-gray-900">
                  {overview?.langflow.interactions_today || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tempo Médio</span>
                <span className="text-sm font-medium text-gray-900">
                  {overview?.langflow.avg_duration_ms || 0}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                <span className="text-sm font-medium text-green-600">
                  {overview?.langflow.success_rate || 0}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Revenue Summary */}
        <Card title="Resumo Financeiro">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Receita Hoje</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                R$ {(overview?.orders.revenue_today || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Receita do Mês</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                R$ {(overview?.orders.revenue_month || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Pagamentos Pendentes</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {overview?.payments.pending || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Pagamentos Hoje</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {overview?.payments.completed_today || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
