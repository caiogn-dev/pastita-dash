/**
 * DashboardPage - Revamp com hierarquia visual, foco em ação e narrativa de operação
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Stack,
  Skeleton,
  Icon,
  Badge,
} from '@chakra-ui/react';
import {
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  MegaphoneIcon,
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
import { useFetch } from '../../hooks/useFetch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../../hooks/useStore';

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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger';
}> = ({ title, value, subtitle, icon, colorPalette = 'brand' }) => {
  const colors = {
    brand: { bg: 'brand.50', icon: 'brand.600', _dark: { bg: 'brand.900' } },
    accent: { bg: 'accent.50', icon: 'accent.600', _dark: { bg: 'accent.900' } },
    success: { bg: 'success.50', icon: 'success.600', _dark: { bg: 'success.900' } },
    warning: { bg: 'warning.50', icon: 'warning.600', _dark: { bg: 'warning.900' } },
    danger: { bg: 'danger.50', icon: 'danger.600', _dark: { bg: 'danger.900' } },
  };

  const color = colors[colorPalette];

  return (
    <Card variant="default" size="md" className="h-full">
      <Flex align="center" gap={4}>
        <Box p={3} borderRadius="xl" bg={color.bg} _dark={color._dark}>
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
  const { store } = useStore();
  const [chartRangeDays, setChartRangeDays] = useState(7);

  const storeKey = store?.slug || store?.id;
  const storeOrdersRoute = storeKey ? `/stores/${storeKey}/orders` : '/stores';
  const storeProductsRoute = storeKey ? `/stores/${storeKey}/products` : '/stores';

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

  const totalMessagesToday = (overview?.messages as { today?: number } | undefined)?.today || 0;
  const deliveredMessages = (overview?.messages as { delivered?: number } | undefined)?.delivered || 0;
  const readMessages = (overview?.messages as { read?: number } | undefined)?.read || 0;
  const failedMessages = (overview?.messages as { failed?: number } | undefined)?.failed || 0;
  const deliveredRate = totalMessagesToday > 0 ? Math.round((deliveredMessages / totalMessagesToday) * 100) : 0;

  const chartRangeOptions = [
    { value: 7, label: 'Últimos 7 dias' },
    { value: 14, label: 'Últimos 14 dias' },
    { value: 30, label: 'Últimos 30 dias' },
    { value: 90, label: 'Últimos 90 dias' },
  ];

  const messagesChartData = {
    labels: charts?.messages_per_day?.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Recebidas',
        data: charts?.messages_per_day?.map((d) => d.inbound) || [],
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Enviadas',
        data: charts?.messages_per_day?.map((d) => d.outbound) || [],
        borderColor: '#722F37',
        backgroundColor: 'rgba(114, 47, 55, 0.14)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day?.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      {
        label: 'Pedidos',
        data: charts?.orders_per_day?.map((d) => d.count) || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.14)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const statusChartData = {
    labels: ['Entregue', 'Lido', 'Falhou'],
    datasets: [
      {
        data: [deliveredMessages, readMessages, failedMessages],
        backgroundColor: ['#22c55e', '#0ea5e9', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = useMemo(() => ({
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
          color: 'rgba(113, 113, 122, 0.12)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }), []);

  return (
    <Stack gap={6}>
      <Card variant="default" size="lg" className="overflow-hidden">
        <Flex justify="space-between" align={{ base: 'flex-start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4}>
          <Stack gap={2}>
            <Badge colorPalette="brand" width="fit-content" px={3} py={1} borderRadius="full">Operação em tempo real</Badge>
            <Heading size="xl" color="fg.primary">Visão executiva do seu dashboard</Heading>
            <Text color="fg.muted" maxW="720px">
              Acompanhe pedidos, conversas e receita com foco em ações rápidas para manter a operação fluida.
              {selectedAccount && ` Conta ativa: ${selectedAccount.name}.`}
            </Text>
          </Stack>
          <Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
            <Button leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={() => window.location.href = '/whatsapp/chat'}>
              Abrir atendimento
            </Button>
            <Button variant="outline" leftIcon={<MegaphoneIcon className="w-4 h-4" />} onClick={() => window.location.href = '/marketing'}>
              Acessar marketing
            </Button>
          </Stack>
        </Flex>
      </Card>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
        <GridItem>{isLoadingOverview ? <Skeleton height="108px" borderRadius="lg" /> : <StatCard title="Mensagens Hoje" value={totalMessagesToday} subtitle="Total de mensagens" icon={ChatBubbleLeftRightIcon} colorPalette="brand" />}</GridItem>
        <GridItem>{isLoadingOverview ? <Skeleton height="108px" borderRadius="lg" /> : <StatCard title="Pedidos" value={(overview?.orders as { today?: number } | undefined)?.today || 0} subtitle="Pedidos hoje" icon={ShoppingCartIcon} colorPalette="accent" />}</GridItem>
        <GridItem>{isLoadingOverview ? <Skeleton height="108px" borderRadius="lg" /> : <StatCard title="Receita" value={`R$ ${((overview?.orders as { revenue_today?: number } | undefined)?.revenue_today || 0).toFixed(2)}`} subtitle="Receita de hoje" icon={CurrencyDollarIcon} colorPalette="success" />}</GridItem>
        <GridItem>{isLoadingOverview ? <Skeleton height="108px" borderRadius="lg" /> : <StatCard title="Conversas" value={(overview?.conversations as { active?: number } | undefined)?.active || 0} subtitle="Conversas ativas" icon={UsersIcon} colorPalette="warning" />}</GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', lg: '1.8fr 1fr' }} gap={6}>
        <GridItem>
          <Card title="Performance de Mensagens" subtitle="Recebidas vs enviadas por período" action={
            <select
              value={chartRangeDays}
              onChange={(e) => setChartRangeDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
            >
              {chartRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          }>
            {isLoadingCharts ? <Skeleton height="320px" /> : <Box height="320px"><Line data={messagesChartData} options={chartOptions} /></Box>}
          </Card>
        </GridItem>

        <GridItem>
          <Card title="Saúde da operação" subtitle="Indicadores de entrega e leitura">
            <Stack gap={4}>
              <Box>
                <Flex align="center" justify="space-between" mb={1}>
                  <Text fontSize="sm" color="fg.muted">Taxa de entrega</Text>
                  <Text fontSize="sm" fontWeight="semibold">{deliveredRate}%</Text>
                </Flex>
                <Box h="8px" borderRadius="full" bg="gray.100" _dark={{ bg: "zinc.800" }} overflow="hidden">
                  <Box h="full" w={`${deliveredRate}%`} bg="green.500" borderRadius="full" />
                </Box>
              </Box>

              <Stack gap={2}>
                <Flex justify="space-between"><Text fontSize="sm">Entregues</Text><Text fontWeight="semibold">{deliveredMessages}</Text></Flex>
                <Flex justify="space-between"><Text fontSize="sm">Lidas</Text><Text fontWeight="semibold">{readMessages}</Text></Flex>
                <Flex justify="space-between"><Text fontSize="sm">Falhas</Text><Text fontWeight="semibold">{failedMessages}</Text></Flex>
              </Stack>

              <Stack gap={2} pt={2} borderTopWidth="1px" borderColor="border.subtle">
                <Button variant="outline" leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />} onClick={() => window.location.href = '/analytics'}>
                  Ver analytics
                </Button>
                <Button variant="outline" leftIcon={<FireIcon className="w-4 h-4" />} onClick={() => window.location.href = storeOrdersRoute}>
                  Priorizar pedidos
                </Button>
                <Button variant="outline" leftIcon={<ShoppingCartIcon className="w-4 h-4" />} onClick={() => window.location.href = storeProductsRoute}>
                  Atualizar catálogo
                </Button>
              </Stack>
            </Stack>
          </Card>
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        <GridItem>
          <Card title="Pedidos por dia" subtitle="Volume diário no período selecionado">
            {isLoadingCharts ? <Skeleton height="300px" /> : <Box height="300px"><Line data={ordersChartData} options={chartOptions} /></Box>}
          </Card>
        </GridItem>

        <GridItem>
          <Card title="Status das mensagens" subtitle="Distribuição do resultado">
            {isLoadingOverview ? (
              <Skeleton height="300px" />
            ) : (
              <Box height="300px" maxW="320px" mx="auto">
                <Doughnut data={statusChartData} options={{ ...chartOptions, cutout: '62%' }} />
              </Box>
            )}
          </Card>
        </GridItem>
      </Grid>
    </Stack>
  );
};

export default DashboardPage;
