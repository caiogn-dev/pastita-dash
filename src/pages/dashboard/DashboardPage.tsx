import React, { useEffect, useState } from 'react';
import logger from '../../services/logger';
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
import { Card, StatCard, PageLoading, Loading, Select } from '../../components/common';
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
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [chartRangeDays, setChartRangeDays] = useState(7);

  useEffect(() => {
    loadOverview();
  }, [selectedAccount]);

  useEffect(() => {
    loadCharts();
  }, [selectedAccount, chartRangeDays]);

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const overviewData = await dashboardService.getOverview(selectedAccount?.id);
      setOverview(overviewData);
    } catch (error) {
      logger.error('Error loading dashboard:', error);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadCharts = async () => {
    setIsLoadingCharts(true);
    try {
      const chartsData = await dashboardService.getCharts(selectedAccount?.id, chartRangeDays);
      setCharts(chartsData);
    } catch (error) {
      logger.error('Error loading charts:', error);
    } finally {
      setIsLoadingCharts(false);
    }
  };

  if (isLoadingOverview && !overview) {
    return <PageLoading />;
  }

  const chartRangeOptions = [
    { value: '7', label: 'Últimos 7 dias' },
    { value: '14', label: 'Últimos 14 dias' },
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
  ];

  const chartRangeLabel = chartRangeDays === 1 ? '1 dia' : `${chartRangeDays} dias`;
  const showChartsLoading = isLoadingCharts && !charts;

  const messagesChartData = {
    labels: charts?.messages_per_day?.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Recebidas',
        data: charts?.messages_per_day?.map((d) => d.inbound) || [],
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Enviadas',
        data: charts?.messages_per_day?.map((d) => d.outbound) || [],
        borderColor: '#128C7E',
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day?.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Pedidos',
        data: charts?.orders_per_day?.map((d) => d.count) || [],
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Receita (R$)',
        data: charts?.orders_per_day?.map((d) => d.revenue) || [],
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const conversationsChartData = {
    labels: charts?.conversations_per_day?.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Novas',
        data: charts?.conversations_per_day?.map((d) => d.new) || [],
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Resolvidas',
        data: charts?.conversations_per_day?.map((d) => d.resolved) || [],
        borderColor: '#14B8A6',
        backgroundColor: 'rgba(20, 184, 166, 0.12)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const messageTypeLabels = Object.keys(charts?.message_types || {});
  const messageTypeLabelMap: Record<string, string> = {
    text: 'Texto',
    image: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    document: 'Documento',
    sticker: 'Sticker',
    location: 'Localização',
    contact: 'Contato',
  };

  const messageTypesData = {
    labels: messageTypeLabels.map((label) => messageTypeLabelMap[label] || label.replace(/_/g, ' ')),
    datasets: [
      {
        data: messageTypeLabels.map((label) => charts?.message_types?.[label] || 0),
        backgroundColor: [
          '#34D399',
          '#60A5FA',
          '#FBBF24',
          '#F472B6',
          '#A78BFA',
          '#F97316',
          '#2DD4BF',
          '#93C5FD',
        ],
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

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <StatCard
            title="Mensagens Hoje"
            value={overview?.messages.today || 0}
            icon={<InboxIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
          <StatCard
            title="Conversas Ativas"
            value={overview?.conversations.active || 0}
            icon={<ChatBubbleLeftRightIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
          <StatCard
            title="Pedidos Hoje"
            value={overview?.orders.today || 0}
            icon={<ShoppingCartIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
          <StatCard
            title="Receita Hoje"
            value={`R$ ${(overview?.orders.revenue_today || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<CurrencyDollarIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
          <StatCard
            title="Interações LLM"
            value={overview?.langflow.interactions_today || 0}
            icon={<CpuChipIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
          <StatCard
            title="Contas Ativas"
            value={overview?.accounts.active || 0}
            icon={<UserGroupIcon className="w-5 h-5 md:w-6 md:h-6" />}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Analytics detalhado</h2>
            <p className="text-xs md:text-sm text-gray-500">
              Indicadores dos últimos {chartRangeLabel}.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              label="Período"
              value={String(chartRangeDays)}
              onChange={(e) => setChartRangeDays(Number(e.target.value))}
              options={chartRangeOptions}
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Chart */}
          <Card title={`Mensagens (${chartRangeLabel})`} className="lg:col-span-2">
            <div className="h-80">
              {showChartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loading size="lg" />
                </div>
              ) : (
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
              )}
            </div>
          </Card>

          {/* Order Status Chart */}
          <Card title="Status dos Pedidos">
            <div className="h-80 flex items-center justify-center">
              {showChartsLoading ? (
                <Loading size="lg" />
              ) : (
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
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title={`Pedidos e Receita (${chartRangeLabel})`} className="lg:col-span-2">
            <div className="h-80">
              {showChartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loading size="lg" />
                </div>
              ) : (
                <Line
                  data={ordersChartData}
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
                        title: {
                          display: true,
                          text: 'Pedidos',
                        },
                      },
                      y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                          drawOnChartArea: false,
                        },
                        ticks: {
                          callback: (value) =>
                            `R$ ${Number(value).toLocaleString('pt-BR')}`,
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </Card>

          <Card title="Tipos de Mensagem">
            <div className="h-80 flex items-center justify-center">
              {showChartsLoading ? (
                <Loading size="lg" />
              ) : (
                <Doughnut
                  data={messageTypesData}
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
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title={`Conversas (${chartRangeLabel})`} className="lg:col-span-3">
            <div className="h-80">
              {showChartsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loading size="lg" />
                </div>
              ) : (
                <Line
                  data={conversationsChartData}
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
              )}
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
