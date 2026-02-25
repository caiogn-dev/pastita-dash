/**
 * DashboardPage - Página de dashboard moderna com Chakra UI v3
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Select,
  Skeleton,
  Icon,
} from '@chakra-ui/react';
import {
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  UsersIcon,
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
import { Card, Button } from '../../components/common';
import { dashboardService } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { DashboardOverview, DashboardCharts } from '../../types';
import { useFetch } from '../../hooks/useFetch';
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

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger';
}> = ({ title, value, subtitle, icon, colorPalette = 'brand' }) => {
  const colors = {
    brand: { bg: 'brand.50', icon: 'brand.500', _dark: { bg: 'brand.900' } },
    accent: { bg: 'accent.50', icon: 'accent.500', _dark: { bg: 'accent.900' } },
    success: { bg: 'success.50', icon: 'success.500', _dark: { bg: 'success.900' } },
    warning: { bg: 'warning.50', icon: 'warning.500', _dark: { bg: 'warning.900' } },
    danger: { bg: 'danger.50', icon: 'danger.500', _dark: { bg: 'danger.900' } },
  };

  const color = colors[colorPalette];

  return (
    <Card variant="filled" size="md">
      <Flex align="center" gap={4}>
        <Box
          p={3}
          borderRadius="lg"
          bg={color.bg}
          _dark={color._dark}
        >
          <Icon as={icon} boxSize={6} color={color.icon} />
        </Box>
        <Stack gap={0.5}>
          <Text fontSize="sm" color="fg.muted">{title}</Text>
          <Heading size="lg" color="fg.primary">{value}</Heading>
          {subtitle && <Text fontSize="xs" color="fg.muted">{subtitle}</Text>}
        </Stack>
      </Flex>
    </Card>
  );
};

export const DashboardPage: React.FC = () => {
  const { selectedAccount } = useAccountStore();
  const [chartRangeDays, setChartRangeDays] = useState(7);

  const fetchOverview = useCallback(
    () => dashboardService.getOverview(selectedAccount?.id),
    [selectedAccount?.id]
  );
  
  const { data: overview, loading: isLoadingOverview } = useFetch(fetchOverview);

  const fetchCharts = useCallback(
    () => dashboardService.getCharts(selectedAccount?.id, chartRangeDays),
    [selectedAccount?.id, chartRangeDays]
  );
  
  const { data: charts, loading: isLoadingCharts } = useFetch(fetchCharts);

  const chartRangeOptions = [
    { value: 7, label: 'Últimos 7 dias' },
    { value: 14, label: 'Últimos 14 dias' },
    { value: 30, label: 'Últimos 30 dias' },
    { value: 90, label: 'Últimos 90 dias' },
  ];

  const messagesChartData = {
    labels: charts?.messages_per_day?.map((d) => 
      format(new Date(d.date), 'dd/MM', { locale: ptBR })
    ) || [],
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
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day?.map((d) => 
      format(new Date(d.date), 'dd/MM', { locale: ptBR })
    ) || [],
    datasets: [
      {
        label: 'Pedidos',
        data: charts?.orders_per_day?.map((d) => d.count) || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const statusChartData = {
    labels: ['Entregue', 'Lido', 'Falhou'],
    datasets: [
      {
        data: [
          overview?.messages?.delivered || 0,
          overview?.messages?.read || 0,
          overview?.messages?.failed || 0,
        ],
        backgroundColor: ['#22c55e', '#0ea5e9', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <Box p={6}>
      <Stack gap={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Stack gap={1}>
            <Heading size="xl" color="fg.primary">Dashboard</Heading>
            <Text color="fg.muted">
              Visão geral do seu negócio
              {selectedAccount && ` - ${selectedAccount.name}`}
            </Text>
          </Stack>
          
          <Select
            value={chartRangeDays}
            onChange={(e) => setChartRangeDays(Number(e.target.value))}
            width="200px"
          >
            {chartRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Flex>

        {/* Stats Grid */}
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
          gap={4}
        >
          <GridItem>
            {isLoadingOverview ? (
              <Skeleton height="100px" borderRadius="lg" />
            ) : (
              <StatCard
                title="Mensagens Hoje"
                value={overview?.messages?.today || 0}
                subtitle="Total de mensagens"
                icon={ChatBubbleLeftRightIcon}
                colorPalette="brand"
              />
            )}
          </GridItem>
          
          <GridItem>
            {isLoadingOverview ? (
              <Skeleton height="100px" borderRadius="lg" />
            ) : (
              <StatCard
                title="Pedidos"
                value={overview?.orders?.today || 0}
                subtitle="Pedidos hoje"
                icon={ShoppingCartIcon}
                colorPalette="accent"
              />
            )}
          </GridItem>
          
          <GridItem>
            {isLoadingOverview ? (
              <Skeleton height="100px" borderRadius="lg" />
            ) : (
              <StatCard
                title="Receita"
                value={`R$ ${(overview?.orders?.revenue_today || 0).toFixed(2)}`}
                subtitle="Receita de hoje"
                icon={CurrencyDollarIcon}
                colorPalette="success"
              />
            )}
          </GridItem>
          
          <GridItem>
            {isLoadingOverview ? (
              <Skeleton height="100px" borderRadius="lg" />
            ) : (
              <StatCard
                title="Conversas"
                value={overview?.conversations?.active || 0}
                subtitle="Conversas ativas"
                icon={UsersIcon}
                colorPalette="warning"
              />
            )}
          </GridItem>
        </Grid>

        {/* Charts */}
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
          <GridItem>
            <Card title="Mensagens" subtitle="Recebidas vs Enviadas">
              {isLoadingCharts ? (
                <Skeleton height="300px" />
              ) : (
                <Box height="300px">
                  <Line data={messagesChartData} options={chartOptions} />
                </Box>
              )}
            </Card>
          </GridItem>
          
          <GridItem>
            <Card title="Pedidos" subtitle="Por dia">
              {isLoadingCharts ? (
                <Skeleton height="300px" />
              ) : (
                <Box height="300px">
                  <Line data={ordersChartData} options={chartOptions} />
                </Box>
              )}
            </Card>
          </GridItem>
          
          <GridItem>
            <Card title="Status das Mensagens" subtitle="Distribuição">
              {isLoadingOverview ? (
                <Skeleton height="300px" />
              ) : (
                <Box height="300px" maxW="300px" mx="auto">
                  <Doughnut 
                    data={statusChartData} 
                    options={{
                      ...chartOptions,
                      cutout: '60%',
                    }} 
                  />
                </Box>
              )}
            </Card>
          </GridItem>
          
          <GridItem>
            <Card title="Ações Rápidas">
              <Stack gap={3}>
                <Button 
                  colorPalette="brand" 
                  leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
                  onClick={() => window.location.href = '/whatsapp/chat'}
                >
                  Abrir Chat
                </Button>
                <Button 
                  variant="outline"
                  leftIcon={<ShoppingCartIcon className="w-4 h-4" />}
                  onClick={() => window.location.href = '/orders'}
                >
                  Ver Pedidos
                </Button>
              </Stack>
            </Card>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
};

export default DashboardPage;
