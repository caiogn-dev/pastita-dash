/**
 * Dashboard Types - Type-safe definitions for all dashboard data
 * Aligned with backend responses from apps.core.dashboard_views
 */

/**
 * Message statuses (from Message model)
 */
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'pending';

/**
 * Message directions
 */
export type MessageDirection = 'inbound' | 'outbound';

/**
 * Conversation modes (from Conversation model)
 */
export type ConversationMode = 'auto' | 'human' | 'hybrid';

/**
 * Conversation statuses (from Conversation model)
 */
export type ConversationStatus = 'open' | 'closed' | 'pending' | 'resolved';

/**
 * Order statuses (from StoreOrder model)
 */
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'paid' 
  | 'preparing' 
  | 'ready' 
  | 'shipped' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled' 
  | 'refunded' 
  | 'failed';

/**
 * Payment statuses (from StoreOrder.payment_status)
 */
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

/**
 * Message direction breakdown
 */
export interface MessagesByDirection {
  inbound: number;
  outbound: number;
}

/**
 * Message status breakdown
 */
export interface MessagesByStatus {
  sent?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  pending?: number;
  [key: string]: number | undefined;
}

/**
 * Conversation mode breakdown
 */
export interface ConversationsByMode {
  auto?: number;
  human?: number;
  hybrid?: number;
  [key: string]: number | undefined;
}

/**
 * Conversation status breakdown
 */
export interface ConversationsByStatus {
  open?: number;
  closed?: number;
  pending?: number;
  resolved?: number;
  [key: string]: number | undefined;
}

/**
 * Order status breakdown
 */
export type OrdersByStatus = Record<OrderStatus, number>;

/**
 * Message distribution by type
 */
export interface MessageTypes {
  text?: number;
  image?: number;
  audio?: number;
  video?: number;
  document?: number;
  button?: number;
  list?: number;
  template?: number;
  sticker?: number;
  interactive?: number;
  location?: number;
  system?: number;
  [key: string]: number | undefined;
}

/**
 * Account summary
 */
export interface AccountsSummary {
  total: number;
  active: number;
  inactive: number;
}

/**
 * Messages aggregate metrics
 */
export interface MessagesMetrics {
  today: number;
  week: number;
  month: number;
  by_direction: MessagesByDirection;
  by_status: MessagesByStatus;
}

/**
 * Conversations aggregate metrics
 */
export interface ConversationsMetrics {
  active: number;
  by_status: ConversationsByStatus;
  by_mode: ConversationsByMode;
  resolved_today: number;
}

/**
 * Orders aggregate metrics
 */
export interface OrdersMetrics {
  today: number;
  by_status: OrdersByStatus;
  revenue_today: number;
  revenue_month: number;
}

/**
 * Payments aggregate metrics
 */
export interface PaymentsMetrics {
  pending: number;
  completed_today: number;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  interactions_today: number;
  avg_duration_ms: number;
}

/**
 * Complete dashboard overview
 */
export interface DashboardOverview {
  accounts: AccountsSummary;
  messages: MessagesMetrics;
  conversations: ConversationsMetrics;
  orders: OrdersMetrics;
  payments: PaymentsMetrics;
  agents: AgentMetrics;
  timestamp: string | null;
}

/**
 * Daily chart data point
 */
export interface DailyMessageChart {
  date: string; // YYYY-MM-DD
  inbound: number;
  outbound: number;
  total: number;
}

/**
 * Order chart data point
 */
export interface DailyOrderChart {
  date: string; // YYYY-MM-DD
  count: number;
  revenue: number;
}

/**
 * Conversation chart data point
 */
export interface DailyConversationChart {
  date: string; // YYYY-MM-DD
  new: number;
  resolved: number;
}

/**
 * Complete charts data
 */
export interface DashboardCharts {
  messages_per_day: DailyMessageChart[];
  orders_per_day: DailyOrderChart[];
  conversations_per_day: DailyConversationChart[];
  message_types: MessageTypes;
  order_statuses: OrdersByStatus;
}

/**
 * Query options for dashboard data fetching
 */
export interface DashboardQueryOptions {
  accountId?: string;
  store?: string;
  days?: number;
}

/**
 * Formatted dashboard data for UI display
 */
export interface FormattedDashboardData {
  overview: DashboardOverview;
  charts: DashboardCharts;
  isLoading: boolean;
  error?: string | null;
  timestamp: Date;
}

/**
 * Chart configuration options
 */
export interface ChartRangeOption {
  value: number;
  label: string;
}

/**
 * Dashboard page state
 */
export interface DashboardPageState {
  chartRangeDays: number;
  isLoadingOverview: boolean;
  isLoadingCharts: boolean;
  overview: DashboardOverview | null;
  charts: DashboardCharts | null;
  error: string | null;
}

/**
 * Type guards for runtime validation
 */
export const isMessageStatus = (value: unknown): value is MessageStatus => {
  return typeof value === 'string' && ['sent', 'delivered', 'read', 'failed', 'pending'].includes(value);
};

export const isMessageDirection = (value: unknown): value is MessageDirection => {
  return typeof value === 'string' && ['inbound', 'outbound'].includes(value);
};

export const isConversationMode = (value: unknown): value is ConversationMode => {
  return typeof value === 'string' && ['auto', 'human', 'hybrid'].includes(value);
};

export const isConversationStatus = (value: unknown): value is ConversationStatus => {
  return typeof value === 'string' && ['open', 'closed', 'pending', 'resolved'].includes(value);
};

export const isOrderStatus = (value: unknown): value is OrderStatus => {
  const validStatuses: OrderStatus[] = [
    'pending', 'confirmed', 'processing', 'paid', 'preparing', 'ready', 
    'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded', 'failed'
  ];
  return typeof value === 'string' && validStatuses.includes(value as OrderStatus);
};

export const isDashboardOverview = (value: unknown): value is DashboardOverview => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accounts' in value &&
    'messages' in value &&
    'conversations' in value &&
    'orders' in value &&
    'payments' in value &&
    'agents' in value
  );
};

export const isDashboardCharts = (value: unknown): value is DashboardCharts => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'messages_per_day' in value &&
    'orders_per_day' in value &&
    'conversations_per_day' in value
  );
};
