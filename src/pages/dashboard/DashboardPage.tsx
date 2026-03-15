/**
 * DashboardPage - Revamp com hierarquia visual, foco em acao e narrativa de operacao
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNotificationSound, useOrdersWebSocket, useStore } from '../../hooks';

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

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

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
  const { playNotificationSound } = useNotificationSound();
  const [chartRangeDays, setChartRangeDays] = useState(7);
  const refreshTimeoutRef = useRef<number | null>(null);

  const storeKey = store?.slug || store?.id;
  const storeOrdersRoute = storeKey ? `/stores/${storeKey}/orders` : '/stores';
  const storeProductsRoute = storeKey ? `/stores/${storeKey}/products` : '/stores';

  const fetchOverview = useCallback(
    () =>
      dashboardService.getOverview({
        store: storeKey || undefined,
        accountId: selectedAccount?.id,
      }),
    [selectedAccount?.id, storeKey]
  );
  const {
    data: overview,
    loading: isLoadingOverview,
    refresh: refreshOverview,
  } = useFetch(fetchOverview);

  const fetchCharts = useCallback(
    () =>
      dashboardService.getCharts({
        store: storeKey || undefined,
        accountId: selectedAccount?.id,
        days: chartRangeDays,
      }),
    [chartRangeDays, selectedAccount?.id, storeKey]
  );
  const {
    data: charts,
    loading: isLoadingCharts,
    refresh: refreshCharts,
  } = useFetch(fetchCharts);

  const scheduleRefresh = useCallback(
    (delay = 700) => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        void Promise.all([refreshOverview(), refreshCharts()]);
      }, delay);
    },
    [refreshCharts, refreshOverview]
  );

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useOrdersWebSocket({
    enabled: Boolean(storeKey),
    onOrderCreated: () => {
      playNotificationSound();
      scheduleRefresh(250);
    },
    onOrderUpdated: () => {
      scheduleRefresh(900);
    },
    onOrderCancelled: () => {
      scheduleRefresh(900);
    },
    onPaymentReceived: () => {
      playNotificationSound();
      scheduleRefresh(500);
    },
  });

  const totalMessagesToday = overview?.messages.today || 0;
  const inboundMessages = Number(overview?.messages.by_direction.inbound || 0);
  const outboundMessages = Number(overview?.messages.by_direction.outbound || 0);
  const sentMessages = Number(overview?.messages.by_status.sent || 0);
  const deliveredMessages = Number(overview?.messages.by_status.delivered || 0);
  const readMessages = Number(overview?.messages.by_status.read || 0);
  const failedMessages = Number(overview?.messages.by_status.failed || 0);
  const deliveryRate = outboundMessages > 0
    ? Math.round(((deliveredMessages + readMessages) / outboundMessages) * 100)
    : 0;

  const chartRangeOptions = [
    { value: 7, label: 'Ultimos 7 dias' },
    { value: 14, label: 'Ultimos 14 dias' },
    { value: 30, label: 'Ultimos 30 dias' },
    { value: 90, label: 'Ultimos 90 dias' },
  ];

  const messagesChartData = {
    labels: charts?.messages_per_day.map((item: { date: string }) =>
      format(new Date(item.date), 'dd/MM', { locale: ptBR })
    ) || [],
    datasets: [
      {
        label: 'Recebidas',
        data: charts?.messages_per_day.map((item: { inbound: number }) => item.inbound) || [],
        borderColor: '#25D366',
        backgroundColor: 'rgba(37, 211, 102, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Enviadas',
        data: charts?.messages_per_day.map((item: { outbound: number }) => item.outbound) || [],
        borderColor: '#722F37',
        backgroundColor: 'rgba(114, 47, 55, 0.14)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day.map((item: { date: string }) =>
      format(new Date(item.date), 'dd/MM', { locale: ptBR })
    ) || [],
    datasets: [
      {
        label: 'Pedidos',
        data: charts?.orders_per_day.map((item: { count: number }) => item.count) || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.14)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const statusChartData = {
    labels: ['Enviadas', 'Entregues', 'Lidas', 'Falhas'],
    datasets: [
      {
        data: [sentMessages, deliveredMessages, readMessages, failedMessages],
        backgroundColor: ['#6366f1', '#22c55e', '#0ea5e9', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const hasStatusData = [sentMessages, deliveredMessages, readMessages, failedMessages].some(
    (value) => value > 0
  );

  const chartOptions = useMemo(
    () => ({
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
    }),
    []
  );

  return (
    <Stack gap={6}>
      <Card variant="default" size="lg" className="overflow-hidden">
        <Flex justify="space-between" align={{ base: 'flex-start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4}>
          <Stack gap={2}>
            <Badge colorPalette="brand" width="fit-content" px={3} py={1} borderRadius="full">Operacao em tempo real</Badge>
            <Heading size="xl" color="fg.primary">Visao executiva do seu dashboard</Heading>
            <Text color="fg.muted" maxW="720px">
              Acompanhe pedidos, conversas e receita com foco em acoes rapidas para manter a operacao fluida.
              {selectedAccount && ` Conta ativa: ${selectedAccount.name}.`}
              {store && ` Loja ativa: ${store.name}.`}
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

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' }} gap={4}>
        <GridItem>
          {isLoadingOverview ? (
            <Skeleton height="108px" borderRadius="lg" />
          ) : (
            <StatCard
              title="Mensagens Hoje"
              value={totalMessagesToday}
              subtitle={`${inboundMessages} recebidas / ${outboundMessages} enviadas`}
              icon={ChatBubbleLeftRightIcon}
              colorPalette="brand"
            />
          )}
        </GridItem>
        <GridItem>
          {isLoadingOverview ? (
            <Skeleton height="108px" borderRadius="lg" />
          ) : (
            <StatCard
              title="Pedidos"
              value={overview?.orders.today || 0}
              subtitle="Pedidos criados hoje"
              icon={ShoppingCartIcon}
              colorPalette="accent"
            />
          )}
        </GridItem>
        <GridItem>
          {isLoadingOverview ? (
            <Skeleton height="108px" borderRadius="lg" />
          ) : (
            <StatCard
              title="Receita"
              value={CURRENCY_FORMATTER.format(overview?.orders.revenue_today || 0)}
              subtitle="Receita confirmada hoje"
              icon={CurrencyDollarIcon}
              colorPalette="success"
            />
          )}
        </GridItem>
        <GridItem>
          {isLoadingOverview ? (
            <Skeleton height="108px" borderRadius="lg" />
          ) : (
            <StatCard
              title="Conversas"
              value={overview?.conversations.active || 0}
              subtitle="Conversas ativas"
              icon={UsersIcon}
              colorPalette="warning"
            />
          )}
        </GridItem>
        <GridItem>
          {isLoadingOverview ? (
            <Skeleton height="108px" borderRadius="lg" />
          ) : (
            <StatCard
              title="IA - Interações"
              value={overview?.agents.interactions_today || 0}
              subtitle={`${overview?.agents.avg_duration_ms?.toFixed(0) || 0}ms med.`}
              icon={FireIcon}
              colorPalette="accent"
            />
          )}
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', lg: '1.8fr 1fr' }} gap={6}>
        <GridItem>
          <Card title="Performance de Mensagens" subtitle="Recebidas vs enviadas por periodo" action={
            <select
              value={chartRangeDays}
              onChange={(event) => setChartRangeDays(Number(event.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm"
            >
              {chartRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          }>
            {isLoadingCharts ? (
              <Skeleton height="320px" />
            ) : (
              <Box height="320px">
                <Line data={messagesChartData} options={chartOptions} />
              </Box>
            )}
          </Card>
        </GridItem>

        <GridItem>
          <Card title="Saude da operacao" subtitle="Indicadores do envio, conversas e agentes IA">
            <Stack gap={4}>
              <Box>
                <Flex align="center" justify="space-between" mb={1}>
                  <Text fontSize="sm" color="fg.muted">Taxa de entrega</Text>
                  <Text fontSize="sm" fontWeight="semibold">{deliveryRate}%</Text>
                </Flex>
                <Box h="8px" borderRadius="full" bg="gray.100" _dark={{ bg: 'zinc.800' }} overflow="hidden">
                  <Box h="full" w={`${deliveryRate}%`} bg="green.500" borderRadius="full" />
                </Box>
              </Box>

              <Stack gap={2} fontSize="sm">
                <Flex justify="space-between"><Text>Saida hoje</Text><Text fontWeight="semibold">{outboundMessages}</Text></Flex>
                <Flex justify="space-between"><Text>Entregues</Text><Text fontWeight="semibold">{deliveredMessages}</Text></Flex>
                <Flex justify="space-between"><Text>Lidas</Text><Text fontWeight="semibold">{readMessages}</Text></Flex>
                <Flex justify="space-between"><Text>Falhas</Text><Text fontWeight="semibold">{failedMessages}</Text></Flex>
              </Stack>

              <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                <Text fontSize="xs" color="fg.muted" mb={2}>Conversas por modo:</Text>
                <Stack gap={1} fontSize="sm">
                  {Object.entries(overview?.conversations.by_mode || {}).map(([mode, count]) => (
                    <Flex key={mode} justify="space-between">
                      <Text textTransform="capitalize">{mode === 'auto' ? 'Automatizado' : mode === 'human' ? 'Humano' : 'Híbrido'}</Text>
                      <Text fontWeight="semibold">{count}</Text>
                    </Flex>
                  ))}
                  {Object.keys(overview?.conversations.by_mode || {}).length === 0 && (
                    <Text color="fg.muted">Sem conversas</Text>
                  )}
                </Stack>
              </Box>

              <Stack gap={2} pt={2} borderTopWidth="1px" borderColor="border.subtle">
                <Button variant="outline" leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />} onClick={() => window.location.href = '/analytics'}>
                  Ver analytics
                </Button>
                <Button variant="outline" leftIcon={<FireIcon className="w-4 h-4" />} onClick={() => window.location.href = storeOrdersRoute}>
                  Priorizar pedidos
                </Button>
                <Button variant="outline" leftIcon={<ShoppingCartIcon className="w-4 h-4" />} onClick={() => window.location.href = storeProductsRoute}>
                  Atualizar catalogo
                </Button>
              </Stack>
            </Stack>
          </Card>
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6}>
        <GridItem>
          <Card title="Pedidos por dia" subtitle="Volume diario no periodo selecionado">
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
          <Card title="Conversas por dia" subtitle="Novas conversas e resolvidas">
            {isLoadingCharts ? (
              <Skeleton height="300px" />
            ) : charts?.conversations_per_day && charts.conversations_per_day.length > 0 ? (
              <Box height="300px">
                <Line 
                  data={{
                    labels: charts.conversations_per_day.map((item) =>
                      format(new Date(item.date), 'dd/MM', { locale: ptBR })
                    ),
                    datasets: [
                      {
                        label: 'Novas',
                        data: charts.conversations_per_day.map((item) => item.new),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        fill: true,
                        tension: 0.35,
                      },
                      {
                        label: 'Resolvidas',
                        data: charts.conversations_per_day.map((item) => item.resolved),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                        fill: true,
                        tension: 0.35,
                      },
                    ],
                  }} 
                  options={chartOptions} 
                />
              </Box>
            ) : (
              <Flex minH="300px" align="center" justify="center">
                <Text color="fg.muted">Sem dados de conversas para o periodo.</Text>
              </Flex>
            )}
          </Card>
        </GridItem>

        <GridItem>
          <Card title="Status das mensagens" subtitle="Distribuicao das mensagens de saida">
            {isLoadingOverview ? (
              <Skeleton height="300px" />
            ) : hasStatusData ? (
              <Box height="300px" maxW="320px" mx="auto">
                <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } }, cutout: '62%' }} />
              </Box>
            ) : (
              <Flex minH="300px" align="center" justify="center">
                <Text color="fg.muted">Sem dados de mensagens para o periodo atual.</Text>
              </Flex>
            )}
          </Card>
        </GridItem>
      </Grid>
    </Stack>
  );
};

export default DashboardPage;
