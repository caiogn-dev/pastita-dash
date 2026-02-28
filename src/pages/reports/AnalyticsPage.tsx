/**
 * Reports Page - Analytics Dashboard
 * Professional reports with charts, filters, and export functionality
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  Badge,
  Separator,
  Flex,
  VStack,
  HStack,
  Grid,
  Tabs,
  Input,
  Select,
  createListCollection,
  Spinner,
  Icon,
  Table,
  Alert,
} from '@chakra-ui/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarIcon,
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TruckIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  reportsService,
  RevenueReport,
  ProductsReport,
  StockReport,
  CustomersReport,
  DashboardStats
} from '../../services/reports';

// =============================================================================
// TYPES
// =============================================================================

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';
type TabValue = 'overview' | 'revenue' | 'products' | 'stock' | 'customers';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  color?: string;
  loading?: boolean;
}

// =============================================================================
// COMPONENTS
// =============================================================================

const MotionCard = motion(Card.Root);

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  color = 'blue.500',
  loading
}) => {
  const isPositive = change >= 0;
  
  return (
    <MotionCard
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      bgGradient={`linear(135deg, ${color}10 0%, ${color}05 100%)`}
      borderColor={`${color}30`}
      borderWidth="1px"
    >
      <Card.Body>
        <Flex justify="space-between" align="flex-start">
          <VStack align="flex-start" gap={1}>
            <Text fontSize="sm" color="fg.muted">{title}</Text>
            {loading ? (
              <Spinner size="md" color={color} />
            ) : (
              <Heading size="lg" color={color}>{value}</Heading>
            )}
            {subtitle && (
              <Text fontSize="xs" color="fg.muted">{subtitle}</Text>
            )}
            {change !== undefined && (
              <HStack gap={1} mt={1}>
                <Icon 
                  as={isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon} 
                  color={isPositive ? 'green.500' : 'red.500'}
                  boxSize={4}
                />
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={isPositive ? 'green.500' : 'red.500'}
                >
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </Text>
                <Text fontSize="xs" color="fg.muted">vs ontem</Text>
              </HStack>
            )}
          </VStack>
          <Box
            p={3}
            borderRadius="xl"
            bg={`${color}15`}
            color={color}
          >
            <Icon as={icon} boxSize={6} />
          </Box>
        </Flex>
      </Card.Body>
    </MotionCard>
  );
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AnalyticsPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [period, setPeriod] = useState<Period>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [productsReport, setProductsReport] = useState<ProductsReport | null>(null);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [customersReport, setCustomersReport] = useState<CustomersReport | null>(null);
  
  // Colors for charts
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  
  // Period options
  const periodOptions = createListCollection({
    items: [
      { label: '7 dias', value: '7d' },
      { label: '30 dias', value: '30d' },
      { label: '90 dias', value: '90d' },
      { label: '1 ano', value: '1y' },
    ],
  });

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [stats, revenue, products, stock, customers] = await Promise.all([
        reportsService.getDashboardStats(),
        reportsService.getRevenueReport({ period, group_by: groupBy }),
        reportsService.getProductsReport({ period }),
        reportsService.getStockReport(),
        reportsService.getCustomersReport({ period })
      ]);
      
      setDashboardStats(stats);
      setRevenueReport(revenue);
      setProductsReport(products);
      setStockReport(stock);
      setCustomersReport(customers);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Erro ao carregar relatórios. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [period, groupBy]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Export handlers
  const handleExportOrders = async () => {
    try {
      const blob = await reportsService.exportOrdersCSV({ period });
      const filename = `pedidos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      reportsService.downloadBlob(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };
  
  // Render Overview Tab
  const renderOverview = () => (
    <VStack gap={6} align="stretch">
      {/* Stats Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        <StatCard
          title="Faturamento Hoje"
          value={formatCurrency(dashboardStats?.today.revenue || 0)}
          change={dashboardStats?.today.revenue_change_percent}
          icon={CurrencyDollarIcon}
          color="green.500"
          loading={loading}
        />
        <StatCard
          title="Pedidos Hoje"
          value={dashboardStats?.today.orders || 0}
          subtitle={`${dashboardStats?.week.orders || 0} esta semana`}
          icon={ShoppingCartIcon}
          color="blue.500"
          loading={loading}
        />
        <StatCard
          title="Pedidos Pendentes"
          value={dashboardStats?.alerts.pending_orders || 0}
          subtitle="Aguardando ação"
          icon={TruckIcon}
          color="orange.500"
          loading={loading}
        />
        <StatCard
          title="Estoque Baixo"
          value={dashboardStats?.alerts.low_stock_products || 0}
          subtitle="Produtos para repor"
          icon={ExclamationTriangleIcon}
          color="red.500"
          loading={loading}
        />
      </Grid>
      
      {/* Revenue Chart */}
      <Card.Root>
        <Card.Header>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Heading size="md">Faturamento</Heading>
            <HStack gap={2}>
              {['day', 'week', 'month'].map((g) => (
                <Button
                  key={g}
                  size="sm"
                  variant={groupBy === g ? 'solid' : 'outline'}
                  onClick={() => setGroupBy(g as GroupBy)}
                >
                  {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </HStack>
          </Flex>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Flex justify="center" py={16}>
              <Spinner size="xl" />
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueReport?.data || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => {
                    try {
                      return format(parseISO(value), 'dd/MM', { locale: ptBR });
                    } catch {
                      return value;
                    }
                  }}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <RechartsTooltip
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Faturamento']}
                  labelFormatter={(label: any) => {
                    try {
                      return format(parseISO(String(label)), "dd 'de' MMMM", { locale: ptBR });
                    } catch {
                      return String(label);
                    }
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total_revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card.Body>
      </Card.Root>
      
      {/* Two Column Layout */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        {/* Top Products */}
        <Card.Root>
          <Card.Header>
            <Flex justify="space-between" align="center">
              <Heading size="md">Produtos Mais Vendidos</Heading>
              <Badge variant="subtle">Top {productsReport?.top_products.length || 0}</Badge>
            </Flex>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <Spinner size="md" />
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Produto</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Qtd</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Receita</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {productsReport?.top_products.slice(0, 5).map((product, index) => (
                    <Table.Row key={product.product_id || index}>
                      <Table.Cell>
                        <HStack gap={2}>
                          {index < 3 && (
                            <Icon 
                              as={StarIcon} 
                              color={index === 0 ? 'yellow.400' : index === 1 ? 'gray.400' : 'orange.400'}
                              boxSize={4}
                              fill="currentColor"
                            />
                          )}
                          <Text fontSize="sm" noOfLines={1} maxW="150px">
                            {product.product_name}
                          </Text>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Text fontSize="sm" fontWeight="medium">
                          {product.total_quantity}
                        </Text>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Text fontSize="sm" color="green.500" fontWeight="medium">
                          {formatCurrency(product.total_revenue)}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>
        
        {/* Customer Stats */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Clientes</Heading>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <Spinner size="md" />
            ) : (
              <VStack gap={4} align="stretch">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box 
                    textAlign="center" 
                    p={4} 
                    bg="blue.50" 
                    borderRadius="xl"
                  >
                    <Heading size="lg" color="blue.500">
                      {customersReport?.summary.total_customers || 0}
                    </Heading>
                    <Text fontSize="sm" color="fg.muted">Total de Clientes</Text>
                  </Box>
                  <Box 
                    textAlign="center" 
                    p={4} 
                    bg="green.50" 
                    borderRadius="xl"
                  >
                    <Heading size="lg" color="green.500">
                      {customersReport?.summary.retention_rate || 0}%
                    </Heading>
                    <Text fontSize="sm" color="fg.muted">Taxa de Retenção</Text>
                  </Box>
                </Grid>
                
                <Separator />
                
                <Flex justify="space-between">
                  <Text fontSize="sm" color="fg.muted">Novos Clientes</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {customersReport?.summary.new_customers || 0}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text fontSize="sm" color="fg.muted">Clientes Recorrentes</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {customersReport?.summary.returning_customers || 0}
                  </Text>
                </Flex>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>
    </VStack>
  );
  
  // Render Stock Tab
  const renderStock = () => (
    <VStack gap={6} align="stretch">
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4}>
        <StatCard
          title="Total de Produtos"
          value={stockReport?.summary.total_products || 0}
          icon={CubeIcon}
          color="blue.500"
          loading={loading}
        />
        <StatCard
          title="Estoque Baixo"
          value={stockReport?.summary.low_stock_count || 0}
          subtitle={`Limite: ${stockReport?.summary.low_stock_threshold || 10} unidades`}
          icon={ExclamationTriangleIcon}
          color="orange.500"
          loading={loading}
        />
        <StatCard
          title="Sem Estoque"
          value={stockReport?.summary.out_of_stock_count || 0}
          subtitle="Reposição urgente"
          icon={ExclamationTriangleIcon}
          color="red.500"
          loading={loading}
        />
      </Grid>
      
      <Card.Root>
        <Card.Header>
          <Heading size="md">Produtos com Estoque Baixo</Heading>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <Spinner size="md" />
          ) : stockReport?.low_stock_products.length === 0 ? (
            <Alert.Root status="success" borderRadius="lg">
              <Alert.Indicator>
                <Icon as={CheckCircleIcon} />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Estoque OK!</Alert.Title>
                <Alert.Description>
                  Todos os produtos estão com estoque adequado!
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Produto</Table.ColumnHeader>
                  <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  <Table.ColumnHeader>Categoria</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Estoque</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Preço</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {stockReport?.low_stock_products.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      <Text fontSize="sm" fontWeight="medium">
                        {product.name}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {product.sku || '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="outline" size="sm">
                        {product.category || 'Sem categoria'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Badge
                        size="sm"
                        colorPalette={product.stock_quantity === 0 ? 'red' : 'orange'}
                      >
                        {product.stock_quantity || 0}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm">{formatCurrency(product.price)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        size="sm"
                        colorPalette={product.status === 'active' ? 'green' : 'gray'}
                      >
                        {product.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  );
  
  return (
    <Box p={6}>
      {/* Header */}
      <Flex 
        justify="space-between" 
        align={{ base: 'flex-start', md: 'center' }} 
        mb={6}
        gap={4}
        direction={{ base: 'column', md: 'row' }}
      >
        <Box>
          <Heading size="xl" mb={1}>Relatórios</Heading>
          <Text color="fg.muted">Análise completa do seu negócio</Text>
        </Box>
        
        <HStack gap={3} flexWrap="wrap">
          <Select.Root 
            collection={periodOptions}
            value={[period]}
            onValueChange={(e) => setPeriod(e.value[0] as Period)}
            size="sm"
            minW="120px"
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Período" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {periodOptions.items.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
          
          <Button
            variant="outline"
            onClick={handleExportOrders}
            size="sm"
          >
            <Icon as={ArrowDownTrayIcon} mr={2} />
            Exportar
          </Button>
          
          <Button
            variant="ghost"
            onClick={loadData}
            disabled={loading}
            size="sm"
          >
            <Icon as={ArrowPathIcon} mr={2} />
            Atualizar
          </Button>
        </HStack>
      </Flex>
      
      {/* Error Alert */}
      {error && (
        <Alert.Root status="error" mb={6} borderRadius="lg">
          <Alert.Indicator>
            <Icon as={ExclamationTriangleIcon} />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Erro</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
          <Alert.CloseTrigger onClick={() => setError(null)} />
        </Alert.Root>
      )}
      
      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as TabValue)} mb={6}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Visão Geral</Tabs.Trigger>
          <Tabs.Trigger value="revenue">Faturamento</Tabs.Trigger>
          <Tabs.Trigger value="products">Produtos</Tabs.Trigger>
          <Tabs.Trigger value="stock">Estoque</Tabs.Trigger>
          <Tabs.Trigger value="customers">Clientes</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      
      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'stock' && renderStock()}
      {activeTab === 'revenue' && renderOverview()}
      {activeTab === 'products' && renderOverview()}
      {activeTab === 'customers' && renderOverview()}
    </Box>
  );
};

export default AnalyticsPage;
