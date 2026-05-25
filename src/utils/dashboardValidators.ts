/**
 * Dashboard Data Validators and Transformers
 * Ensures all data from backend is properly validated and type-safe
 */

import {
  DashboardOverview,
  DashboardCharts,
  MessageStatus,
  MessageDirection,
  ConversationMode,
  ConversationStatus,
  OrderStatus,
  PaymentStatus,
  isDashboardOverview,
  isMessageDirection,
  isMessageStatus,
  isConversationMode,
  isConversationStatus,
  isOrderStatus,
} from '../types/dashboard';

/**
 * Validator for backend DashboardOverview response
 */
export const validateDashboardOverview = (data: unknown): data is DashboardOverview => {
  if (!isDashboardOverview(data)) {
    console.warn('[Dashboard] Invalid overview data structure:', data);
    return false;
  }

  // Validate accounts
  if (!data.accounts || typeof data.accounts.total !== 'number') {
    console.warn('[Dashboard] Invalid accounts data');
    return false;
  }

  // Validate messages
  if (!data.messages || typeof data.messages.today !== 'number') {
    console.warn('[Dashboard] Invalid messages data');
    return false;
  }

  // Validate directions
  const directions = Object.keys(data.messages.by_direction || {});
  if (directions.length > 0 && !directions.every((d) => isMessageDirection(d))) {
    console.warn('[Dashboard] Invalid message directions:', directions);
  }

  // Validate status
  const statuses = Object.keys(data.messages.by_status || {});
  if (statuses.length > 0 && !statuses.every((s) => isMessageStatus(s))) {
    console.warn('[Dashboard] Invalid message statuses:', statuses);
  }

  // Validate conversations
  if (!data.conversations || typeof data.conversations.active !== 'number') {
    console.warn('[Dashboard] Invalid conversations data');
    return false;
  }

  // Validate conversation modes
  const modes = Object.keys(data.conversations.by_mode || {});
  if (modes.length > 0 && !modes.every((m) => isConversationMode(m))) {
    console.warn('[Dashboard] Invalid conversation modes:', modes);
  }

  // Validate conversation statuses
  const convStatuses = Object.keys(data.conversations.by_status || {});
  if (convStatuses.length > 0 && !convStatuses.every((s) => isConversationStatus(s))) {
    console.warn('[Dashboard] Invalid conversation statuses:', convStatuses);
  }

  // Validate orders
  if (!data.orders || typeof data.orders.today !== 'number') {
    console.warn('[Dashboard] Invalid orders data');
    return false;
  }

  // Validate order statuses
  const orderStatuses = Object.keys(data.orders.by_status || {});
  if (orderStatuses.length > 0 && !orderStatuses.every((s) => isOrderStatus(s))) {
    console.warn('[Dashboard] Invalid order statuses:', orderStatuses);
  }

  // Validate payments
  if (!data.payments || typeof data.payments.pending !== 'number') {
    console.warn('[Dashboard] Invalid payments data');
    return false;
  }

  // Validate agents
  if (!data.agents || typeof data.agents.interactions_today !== 'number') {
    console.warn('[Dashboard] Invalid agents data');
    return false;
  }

  return true;
};

/**
 * Validator for backend DashboardCharts response
 */
export const validateDashboardCharts = (data: unknown): data is DashboardCharts => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const typedData = data as Record<string, unknown>;

  // Validate arrays exist and are arrays
  if (
    !Array.isArray(typedData.messages_per_day) ||
    !Array.isArray(typedData.orders_per_day) ||
    !Array.isArray(typedData.conversations_per_day)
  ) {
    console.warn('[Dashboard] Invalid charts array structure');
    return false;
  }

  // Validate message_types and order_statuses are objects
  if (
    (typedData.message_types && typeof typedData.message_types !== 'object') ||
    (typedData.order_statuses && typeof typedData.order_statuses !== 'object')
  ) {
    console.warn('[Dashboard] Invalid charts distribution objects');
    return false;
  }

  return true;
};

/**
 * Safe number conversion for dashboard numbers
 */
export const safeNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value === 'number') return Math.max(0, value); // Prevent negative values
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }
  return defaultValue;
};

/**
 * Safe string conversion with type checking
 */
export const safeString = (value: unknown, defaultValue = ''): string => {
  if (typeof value === 'string') return value;
  if (value instanceof String) return value.toString();
  return defaultValue;
};

/**
 * Calculate delivery rate based on message statuses
 * This is derived directly from backend data, not hallucinated
 */
export const calculateDeliveryRate = (byStatus: Record<string, number> | undefined): number => {
  if (!byStatus) return 0;

  const delivered = safeNumber(byStatus.delivered);
  const read = safeNumber(byStatus.read);
  const sent = safeNumber(byStatus.sent);
  const outbound = safeNumber(byStatus.outbound);

  // Use outbound if available, otherwise fallback to sent
  const totalOutbound = outbound > 0 ? outbound : sent;

  if (totalOutbound === 0) return 0;

  const successful = delivered + read;
  return Math.round((successful / totalOutbound) * 100);
};

/**
 * Format currency for display
 */
export const formatCurrency = (value: unknown): string => {
  const num = safeNumber(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: unknown): string => {
  const num = safeNumber(value);
  return `${num}%`;
};

/**
 * Format duration in milliseconds
 */
export const formatDuration = (ms: unknown): string => {
  const num = safeNumber(ms);
  if (num < 1000) return `${Math.round(num)}ms`;
  if (num < 60000) return `${(num / 1000).toFixed(1)}s`;
  return `${(num / 60000).toFixed(1)}m`;
};

/**
 * Get human-readable conversation mode label
 */
export const getConversationModeLabel = (mode: string): string => {
  const modes: Record<string, string> = {
    auto: 'Automatizado',
    human: 'Humano',
    hybrid: 'Híbrido',
  };
  return modes[mode] || mode;
};

/**
 * Get human-readable conversation status label
 */
export const getConversationStatusLabel = (status: string): string => {
  const statuses: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    pending: 'Pendente',
    resolved: 'Resolvida',
  };
  return statuses[status] || status;
};

/**
 * Get human-readable order status label
 */
export const getOrderStatusLabel = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    processing: 'Processando',
    paid: 'Pago',
    preparing: 'Preparando',
    ready: 'Pronto',
    shipped: 'Enviado',
    out_for_delivery: 'Em Entrega',
    delivered: 'Entregue',
    completed: 'Completado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    failed: 'Falhou',
  };
  return statuses[status] || status;
};

/**
 * Get human-readable message status label
 */
export const getMessageStatusLabel = (status: string): string => {
  const statuses: Record<string, string> = {
    sent: 'Enviada',
    delivered: 'Entregue',
    read: 'Lida',
    failed: 'Falhou',
    pending: 'Pendente',
  };
  return statuses[status] || status;
};

/**
 * Validate and coerce dashboard data
 */
export const transformDashboardOverview = (data: unknown): DashboardOverview | null => {
  if (!validateDashboardOverview(data)) {
    return null;
  }

  return data as DashboardOverview;
};

/**
 * Validate and coerce charts data
 */
export const transformDashboardCharts = (data: unknown): DashboardCharts | null => {
  if (!validateDashboardCharts(data)) {
    return null;
  }

  return data as DashboardCharts;
};
