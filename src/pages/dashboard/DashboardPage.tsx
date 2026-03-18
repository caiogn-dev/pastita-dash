/**
 * DashboardPage — Painel operacional de uma loja
 * Design: hierarquia clara, foco em pedidos e atendimento, ações rápidas no topo
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
  ArrowTrendingUpIcon,
  FireIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BoltIcon,
  UserIcon,
  CpuChipIcon,
  ClockIcon,
  EnvelopeIcon,
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => CURRENCY.format(v);

// ──────────────────────────────────────────────────────────
// Alert Banner — appears when there are pending orders / open conversations waiting
// ──────────────────────────────────────────────────────────
const AlertBanner: React.FC<{
  pendingOrders: number;
  openConversations: number;
  storeOrdersRoute: string;
}> = ({ pendingOrders, openConversations, storeOrdersRoute }) => {
  if (pendingOrders === 0 && openConversations === 0) return null;

  return (
    <Flex
      align="center"
      gap={3}
      p={3}
      px={4}
      borderRadius="lg"
      bg="warning.50"
      border="1px solid"
      borderColor="warning.200"
      flexWrap="wrap"
    >
      <Icon as={ExclamationTriangleIcon} boxSize={5} color="warning.600" flexShrink={0} />
      <Flex gap={4} flex={1} flexWrap="wrap" align="center">
        {pendingOrders > 0 && (
          <Text fontSize="sm" fontWeight="medium" color="warning.800">
            <strong>{pendingOrders}</strong> pedido{pendingOrders > 1 ? 's' : ''} aguardando confirmação
          </Text>
        )}
        {openConversations > 0 && (
          <Text fontSize="sm" fontWeight="medium" color="warning.800">
            <strong>{openConversations}</strong> conversa{openConversations > 1 ? 's' : ''} em aberto
          </Text>
        )}
      </Flex>
      <Button
        size="sm"
        variant="outline"
        rightIcon={<ArrowRightIcon className="w-3 h-3" />}
        onClick={() => window.location.href = storeOrdersRoute}
      >
        Ver pedidos
      </Button>
    </Flex>
  );
};

// ──────────────────────────────────────────────────────────
// KPI Card — metric with icon, value, subtitle, optional action link
// ──────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral';
  href?: string;
  badge?: { label: string; variant: 'solid' | 'subtle' | 'outline'; colorPalette?: string };
  loading?: boolean;
}

const variantMap = {
  brand:   { bg: '#faf0f1', icon: '#722F37', border: 'rgba(114,47,55,0.18)' },
  success: { bg: '#f0fdf4', icon: '#16a34a', border: 'rgba(22,163,74,0.18)' },
  warning: { bg: '#fffbeb', icon: '#d97706', border: 'rgba(217,119,6,0.18)' },
  danger:  { bg: '#fff1f2', icon: '#dc2626', border: 'rgba(220,38,38,0.18)' },
  accent:  { bg: '#fff7ed', icon: '#ea580c', border: 'rgba(234,88,12,0.18)' },
  neutral: { bg: '#f8fafc', icon: '#64748b', border: 'rgba(100,116,139,0.18)' },
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, variant = 'brand', href, badge, loading }) => {
  const c = variantMap[variant];
  const boxStyle: React.CSSProperties = {
    cursor: href ? 'pointer' : 'default',
    textDecoration: 'none',
    display: 'block',
    height: '100%',
  };
  const content = (
    <Box
      h="full"
      p={4}
      borderRadius="xl"
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      boxShadow="0 1px 4px rgba(0,0,0,.05)"
      transition="all 0.18s"
      _hover={href ? { borderColor: c.border, boxShadow: '0 4px 16px rgba(0,0,0,.09)', transform: 'translateY(-1px)' } : {}}
      _dark={{ bg: 'zinc.900', borderColor: 'zinc.800' }}
    >
      {loading ? (
        <Stack gap={3}>
          <Skeleton height="20px" width="60%" />
          <Skeleton height="32px" width="40%" />
        </Stack>
      ) : (
        <Flex align="flex-start" justify="space-between" gap={3}>
          <Stack gap={1.5} minWidth={0}>
            <Text fontSize="xs" fontWeight={500} color="fg.muted" letterSpacing="0.04em" textTransform="uppercase">
              {title}
            </Text>
            <Heading size="xl" color="fg.primary" lineHeight={1}>
              {value}
            </Heading>
            {subtitle && (
              <Text fontSize="xs" color="fg.muted" lineHeight={1.4}>
                {subtitle}
              </Text>
            )}
            {badge && (
              <Badge colorPalette={badge.colorPalette || 'brand'} variant={badge.variant} width="fit-content" fontSize="xs">
                {badge.label}
              </Badge>
            )}
          </Stack>
          <Box p={2.5} borderRadius="lg" bg={c.bg} flexShrink={0}>
            <Icon as={icon} boxSize={5} color={c.icon} />
          </Box>
        </Flex>
      )}
    </Box>
  );
  if (href) {
    return <a href={href} style={boxStyle}>{content}</a>;
  }
  return <div style={boxStyle}>{content}</div>;
};

// ──────────────────────────────────────────────────────────
// Progress bar metric row
// ──────────────────────────────────────────────────────────
const MetricRow: React.FC<{ label: string; value: number | string; progress?: number; color?: string }> = ({
  label, value, progress, color = 'green.500',
}) => (
  <Box>
    <Flex justify="space-between" mb={1}>
      <Text fontSize="sm" color="fg.muted">{label}</Text>
      <Text fontSize="sm" fontWeight="semibold" color="fg.primary">{value}</Text>
    </Flex>
    {progress !== undefined && (
      <Box h="6px" borderRadius="full" bg="gray.100" _dark={{ bg: 'zinc.800' }} overflow="hidden">
        <Box h="full" w={`${Math.min(100, progress)}%`} bg={color} borderRadius="full" transition="width 0.5s ease" />
      </Box>
    )}
  </Box>
);

// ──────────────────────────────────────────────────────────
// Conversation mode pill row
// ──────────────────────────────────────────────────────────
const modeLabel: Record<string, { label: string; color: string }> = {
  auto:   { label: 'Automatizado (IA)', color: '#722F37' },
  human:  { label: 'Humano',           color: '#2563eb' },
  hybrid: { label: 'Híbrido',          color: '#7c3aed' },
};

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { selectedAccount } = useAccountStore();
  const { store } = useStore();
  const { playNotificationSound } = useNotificationSound();
  const [chartRangeDays, setChartRangeDays] = useState(7);
  const refreshTimeoutRef = useRef<number | null>(null);

  const storeKey = store?.slug || store?.id;
  const storeOrdersRoute = storeKey ? `/stores/${storeKey}/orders` : '/stores';
  const storeProductsRoute = storeKey ? `/stores/${storeKey}/products` : '/stores';
  const chatRoute = '/whatsapp/chat';

  const fetchOverview = useCallback(
    () => dashboardService.getOverview({ store: storeKey || undefined, accountId: selectedAccount?.id }),
    [selectedAccount?.id, storeKey]
  );
  const { data: overview, loading: isLoadingOverview, refresh: refreshOverview } = useFetch(fetchOverview);

  const fetchCharts = useCallback(
    () => dashboardService.getCharts({ store: storeKey || undefined, accountId: selectedAccount?.id, days: chartRangeDays }),
    [chartRangeDays, selectedAccount?.id, storeKey]
  );
  const { data: charts, loading: isLoadingCharts, refresh: refreshCharts } = useFetch(fetchCharts);

  const scheduleRefresh = useCallback((delay = 700) => {
    if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => void Promise.all([refreshOverview(), refreshCharts()]), delay);
  }, [refreshCharts, refreshOverview]);

  useEffect(() => () => { if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current); }, []);

  useOrdersWebSocket({
    enabled: Boolean(storeKey),
    onOrderCreated: () => { playNotificationSound(); scheduleRefresh(250); },
    onOrderUpdated: () => scheduleRefresh(900),
    onOrderCancelled: () => scheduleRefresh(900),
    onPaymentReceived: () => { playNotificationSound(); scheduleRefresh(500); },
  });

  // ── Derived metrics ──
  const pendingOrders = overview?.orders.by_status.pending || 0;
  const openConversations = overview?.conversations.by_status.open || 0;
  const inboundMessages = Number(overview?.messages.by_direction.inbound || 0);
  const outboundMessages = Number(overview?.messages.by_direction.outbound || 0);
  const deliveredMessages = Number(overview?.messages.by_status.delivered || 0);
  const readMessages = Number(overview?.messages.by_status.read || 0);
  const failedMessages = Number(overview?.messages.by_status.failed || 0);
  const sentMessages = Number(overview?.messages.by_status.sent || 0);
  const deliveryRate = outboundMessages > 0
    ? Math.round(((deliveredMessages + readMessages) / outboundMessages) * 100)
    : 0;
  const readRate = outboundMessages > 0
    ? Math.round((readMessages / outboundMessages) * 100)
    : 0;
  const ordersInProgress = (overview?.orders.by_status.confirmed || 0)
    + (overview?.orders.by_status.preparing || 0)
    + (overview?.orders.by_status.processing || 0);
  const hasStatusData = [sentMessages, deliveredMessages, readMessages, failedMessages].some((v) => v > 0);

  // ── Chart options ──
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, padding: 14, font: { size: 12 } } } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  }), []);

  const messagesChartData = {
    labels: charts?.messages_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [
      { label: 'Recebidas', data: charts?.messages_per_day.map((d) => d.inbound) || [], borderColor: '#25D366', backgroundColor: 'rgba(37,211,102,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
      { label: 'Enviadas',  data: charts?.messages_per_day.map((d) => d.outbound) || [], borderColor: '#722F37', backgroundColor: 'rgba(114,47,55,0.10)', fill: true, tension: 0.35, pointRadius: 3 },
    ],
  };

  const ordersChartData = {
    labels: charts?.orders_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })) || [],
    datasets: [{ label: 'Pedidos', data: charts?.orders_per_day.map((d) => d.count) || [], borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.12)', fill: true, tension: 0.35, pointRadius: 3 }],
  };

  const statusChartData = {
    labels: ['Enviadas', 'Entregues', 'Lidas', 'Falhas'],
    datasets: [{ data: [sentMessages, deliveredMessages, readMessages, failedMessages], backgroundColor: ['#6366f1', '#22c55e', '#0ea5e9', '#ef4444'], borderWidth: 0 }],
  };

  const chartRangeOptions = [
    { value: 7,  label: '7 dias' },
    { value: 14, label: '14 dias' },
    { value: 30, label: '30 dias' },
    { value: 90, label: '90 dias' },
  ];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite';
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <Stack gap={5}>
      {/* ── Hero strip ── */}
      <Flex
        align={{ base: 'flex-start', md: 'center' }}
        justify="space-between"
        direction={{ base: 'column', md: 'row' }}
        gap={3}
        pb={1}
      >
        <Stack gap={0.5}>
          <Text fontSize="sm" color="fg.muted" textTransform="capitalize">{todayLabel}</Text>
          <Heading size="lg" color="fg.primary" fontWeight={600}>
            {greeting}{store?.name ? `, ${store.name}` : ''} 👋
          </Heading>
        </Stack>
        <Flex gap={2} flexWrap="wrap" align="center">
          {/* Live indicator */}
          <Flex align="center" gap={1.5} px={3} py={1.5} borderRadius="full" bg="green.50" border="1px solid" borderColor="green.200">
            <Box w={2} h={2} borderRadius="full" bg="green.500" animation="pulse 2s infinite" />
            <Text fontSize="xs" fontWeight={500} color="green.700">Operação ativa</Text>
          </Flex>
          <Button
            size="sm"
            leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
            onClick={() => window.location.href = chatRoute}
          >
            Abrir chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<ShoppingCartIcon className="w-4 h-4" />}
            onClick={() => window.location.href = storeOrdersRoute}
          >
            Pedidos
          </Button>
        </Flex>
      </Flex>

      {/* ── Alert banner ── */}
      <AlertBanner
        pendingOrders={pendingOrders}
        openConversations={openConversations}
        storeOrdersRoute={storeOrdersRoute}
      />

      {/* ── KPI Strip ── */}
      <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }} gap={3}>
        <GridItem>
          <KpiCard
            title="Receita hoje"
            value={fmt(overview?.orders.revenue_today || 0)}
            subtitle={`Mês: ${fmt(overview?.orders.revenue_month || 0)}`}
            icon={CurrencyDollarIcon}
            variant="success"
            href={storeOrdersRoute}
            loading={isLoadingOverview}
          />
        </GridItem>
        <GridItem>
          <KpiCard
            title="Pedidos hoje"
            value={overview?.orders.today || 0}
            subtitle={pendingOrders > 0 ? `${pendingOrders} pendente(s)` : `${ordersInProgress} em andamento`}
            icon={ShoppingCartIcon}
            variant={pendingOrders > 0 ? 'warning' : 'accent'}
            href={storeOrdersRoute}
            badge={pendingOrders > 0 ? { label: `${pendingOrders} pendente${pendingOrders > 1 ? 's' : ''}`, variant: 'subtle', colorPalette: 'warning' } : undefined}
            loading={isLoadingOverview}
          />
        </GridItem>
        <GridItem>
          <KpiCard
            title="Conversas ativas"
            value={overview?.conversations.active || 0}
            subtitle={`${openConversations} em aberto`}
            icon={ChatBubbleLeftRightIcon}
            variant={openConversations > 5 ? 'danger' : 'brand'}
            href={chatRoute}
            loading={isLoadingOverview}
          />
        </GridItem>
        <GridItem>
          <KpiCard
            title="Mensagens hoje"
            value={overview?.messages.today || 0}
            subtitle={`${inboundMessages} rec. / ${outboundMessages} env.`}
            icon={EnvelopeIcon}
            variant="neutral"
            loading={isLoadingOverview}
          />
        </GridItem>
        <GridItem>
          <KpiCard
            title="Taxa entrega"
            value={`${deliveryRate}%`}
            subtitle={`${readRate}% de leitura`}
            icon={CheckCircleIcon}
            variant={deliveryRate >= 85 ? 'success' : deliveryRate >= 60 ? 'warning' : 'danger'}
            loading={isLoadingOverview}
          />
        </GridItem>
        <GridItem>
          <KpiCard
            title="IA hoje"
            value={overview?.agents.interactions_today || 0}
            subtitle={`${overview?.agents.avg_duration_ms?.toFixed(0) || 0}ms méd.`}
            icon={CpuChipIcon}
            variant="accent"
            href="/agents"
            loading={isLoadingOverview}
          />
        </GridItem>
      </Grid>

      {/* ── Main charts row ── */}
      <Grid templateColumns={{ base: '1fr', lg: '1.8fr 1fr' }} gap={4}>
        {/* Messages over time */}
        <GridItem>
          <Card
            title="Mensagens por período"
            subtitle="Recebidas vs. enviadas"
            action={
              <Flex align="center" gap={2}>
                <Text fontSize="xs" color="fg.muted">Período:</Text>
                <select
                  value={chartRangeDays}
                  onChange={(e) => setChartRangeDays(Number(e.target.value))}
                  style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white' }}
                >
                  {chartRangeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Flex>
            }
          >
            {isLoadingCharts ? (
              <Skeleton height="300px" borderRadius="lg" />
            ) : (
              <Box height="300px">
                <Line data={messagesChartData} options={chartOptions} />
              </Box>
            )}
          </Card>
        </GridItem>

        {/* Operations health panel */}
        <GridItem>
          <Card title="Saúde da operação" subtitle="Métricas em tempo real">
            <Stack gap={4}>
              <MetricRow label="Taxa de entrega" value={`${deliveryRate}%`} progress={deliveryRate} color={deliveryRate >= 85 ? 'green.500' : deliveryRate >= 60 ? 'yellow.500' : 'red.500'} />
              <MetricRow label="Taxa de leitura" value={`${readRate}%`} progress={readRate} color="blue.500" />

              <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                <Text fontSize="xs" fontWeight={500} color="fg.muted" mb={2} textTransform="uppercase" letterSpacing="0.04em">
                  Mensagens de saída
                </Text>
                <Stack gap={1.5}>
                  <MetricRow label="Enviadas"  value={sentMessages} />
                  <MetricRow label="Entregues" value={deliveredMessages} />
                  <MetricRow label="Lidas"     value={readMessages} />
                  {failedMessages > 0 && (
                    <MetricRow label="Falhas" value={failedMessages} />
                  )}
                </Stack>
              </Box>

              <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                <Text fontSize="xs" fontWeight={500} color="fg.muted" mb={2} textTransform="uppercase" letterSpacing="0.04em">
                  Pedidos em andamento
                </Text>
                <Stack gap={1.5}>
                  {pendingOrders > 0 && (
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color="warning.700" fontWeight={500}>Pendentes</Text>
                      <Badge colorPalette="warning" variant="subtle">{pendingOrders}</Badge>
                    </Flex>
                  )}
                  <MetricRow label="Confirmados"  value={overview?.orders.by_status.confirmed || 0} />
                  <MetricRow label="Em preparo"   value={overview?.orders.by_status.preparing || 0} />
                  <MetricRow label="Entregues hoje" value={overview?.orders.by_status.delivered || 0} />
                </Stack>
              </Box>

              <Stack gap={2} pt={1}>
                <Button variant="outline" size="sm" leftIcon={<ShoppingCartIcon className="w-4 h-4" />} onClick={() => window.location.href = storeOrdersRoute}>
                  Gerenciar pedidos
                </Button>
                <Button variant="outline" size="sm" leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />} onClick={() => window.location.href = storeProductsRoute}>
                  Atualizar catálogo
                </Button>
              </Stack>
            </Stack>
          </Card>
        </GridItem>
      </Grid>

      {/* ── Secondary charts row ── */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap={4}>
        {/* Orders per day */}
        <GridItem>
          <Card title="Pedidos por dia" subtitle="Volume no período selecionado">
            {isLoadingCharts ? (
              <Skeleton height="240px" borderRadius="lg" />
            ) : (
              <Box height="240px">
                <Line data={ordersChartData} options={chartOptions} />
              </Box>
            )}
          </Card>
        </GridItem>

        {/* Conversations per day */}
        <GridItem>
          <Card title="Conversas por dia" subtitle="Novas e resolvidas">
            {isLoadingCharts ? (
              <Skeleton height="240px" borderRadius="lg" />
            ) : charts?.conversations_per_day && charts.conversations_per_day.length > 0 ? (
              <Box height="240px">
                <Line
                  data={{
                    labels: charts.conversations_per_day.map((d) => format(new Date(d.date), 'dd/MM', { locale: ptBR })),
                    datasets: [
                      { label: 'Novas',     data: charts.conversations_per_day.map((d) => d.new),      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
                      { label: 'Resolvidas', data: charts.conversations_per_day.map((d) => d.resolved), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)',  fill: true, tension: 0.35, pointRadius: 3 },
                    ],
                  }}
                  options={chartOptions}
                />
              </Box>
            ) : (
              <Flex minH="240px" align="center" justify="center">
                <Text fontSize="sm" color="fg.muted">Sem dados de conversas.</Text>
              </Flex>
            )}
          </Card>
        </GridItem>

        {/* Conversation modes + message status */}
        <GridItem>
          <Card title="Canais de atendimento" subtitle="Automação vs. humano">
            <Stack gap={4}>
              {/* Mode breakdown */}
              <Stack gap={2}>
                {Object.entries(overview?.conversations.by_mode || {}).map(([mode, count]) => {
                  const m = modeLabel[mode] ?? { label: mode, color: '#64748b' };
                  const total = Object.values(overview?.conversations.by_mode ?? {}).reduce((acc: number, b) => acc + Number(b ?? 0), 0);
                  const pct = total > 0 ? Math.round((Number(count ?? 0) / total) * 100) : 0;
                  return (
                    <Box key={mode}>
                      <Flex justify="space-between" mb={1}>
                        <Flex align="center" gap={1.5}>
                          <Box w={2} h={2} borderRadius="full" bg={m.color} />
                          <Text fontSize="sm">{m.label}</Text>
                        </Flex>
                        <Text fontSize="sm" fontWeight={600}>{count} ({pct}%)</Text>
                      </Flex>
                      <Box h="6px" borderRadius="full" bg="gray.100" overflow="hidden">
                        <Box h="full" w={`${pct}%`} borderRadius="full" style={{ background: m.color }} />
                      </Box>
                    </Box>
                  );
                })}
                {Object.keys(overview?.conversations.by_mode || {}).length === 0 && (
                  <Text fontSize="sm" color="fg.muted">Sem conversas no período.</Text>
                )}
              </Stack>

              {/* Message status doughnut */}
              {hasStatusData && (
                <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                  <Text fontSize="xs" fontWeight={500} color="fg.muted" mb={2} textTransform="uppercase" letterSpacing="0.04em">
                    Status das mensagens
                  </Text>
                  <Box height="160px" maxW="200px" mx="auto">
                    <Doughnut
                      data={statusChartData}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 8, padding: 10, font: { size: 11 } } } }, cutout: '58%' }}
                    />
                  </Box>
                </Box>
              )}

              <Box borderTopWidth="1px" borderColor="border.subtle" pt={3}>
                <Button variant="outline" size="sm" leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />} onClick={() => window.location.href = chatRoute}>
                  Ir para atendimento
                </Button>
              </Box>
            </Stack>
          </Card>
        </GridItem>
      </Grid>
    </Stack>
  );
};

export default DashboardPage;
