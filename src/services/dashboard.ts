import api from './api';
import {
  DashboardOverview,
  DashboardCharts,
  DashboardQueryOptions,
  DailyMessageChart,
  DailyOrderChart,
  DailyConversationChart,
  DashboardStats,
  DashboardActivity,
} from '../types/dashboard';

/**
 * Build query parameters for dashboard API calls
 */
const buildParams = (options: DashboardQueryOptions = {}): Record<string, string | number> => {
  const params: Record<string, string | number> = {};

  if (options.accountId) {
    params.account_id = options.accountId;
  }

  if (options.store) {
    params.store = options.store;
  }

  if (typeof options.days === 'number') {
    params.days = Math.max(1, Math.min(options.days, 90)); // Clamp between 1-90
  }

  return params;
};

/**
 * Create empty dashboard overview with correct structure
 * No hallucinations - all values come from backend
 */
const emptyOverview = (): DashboardOverview => ({
  accounts: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  messages: {
    today: 0,
    week: 0,
    month: 0,
    by_status: { sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 },
    by_direction: { inbound: 0, outbound: 0 },
  },
  conversations: {
    active: 0,
    by_status: { open: 0, closed: 0, pending: 0, resolved: 0 },
    by_mode: { auto: 0, human: 0, hybrid: 0 },
    resolved_today: 0,
  },
  orders: {
    today: 0,
    by_status: { pending: 0, confirmed: 0, processing: 0, paid: 0, preparing: 0, ready: 0, shipped: 0, out_for_delivery: 0, delivered: 0, completed: 0, cancelled: 0, refunded: 0, failed: 0 },
    revenue_today: 0,
    revenue_month: 0,
  },
  payments: {
    pending: 0,
    completed_today: 0,
  },
  agents: {
    interactions_today: 0,
    avg_duration_ms: 0,
  },
  timestamp: null,
});

/**
 * Create empty charts data with correct structure
 */
const emptyCharts = (): DashboardCharts => ({
  messages_per_day: [],
  orders_per_day: [],
  conversations_per_day: [],
  message_types: { text: 0, image: 0, audio: 0, video: 0, document: 0 },
  order_statuses: {
    pending: 0,
    confirmed: 0,
    processing: 0,
    paid: 0,
    preparing: 0,
    ready: 0,
    shipped: 0,
    out_for_delivery: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
    failed: 0,
  },
});

export const dashboardService = {
  /**
   * Fetch dashboard overview with aggregated metrics
   * Data comes exclusively from backend - no hallucinations
   */
  getOverview: async (options: DashboardQueryOptions = {}): Promise<DashboardOverview> => {
    const fallback = emptyOverview();
    
    try {
      const response = await api.get<DashboardOverview>('/core/dashboard/overview/', {
        params: buildParams(options),
      });
      
      const data = response.data || fallback;
      
      // Validate basic structure to prevent partial/corrupted responses
      if (!data.accounts || !data.messages || !data.conversations || !data.orders) {
        console.warn('[Dashboard] Invalid overview response structure, using fallback');
        return fallback;
      }
      
      return data;
    } catch (error) {
      console.error('[Dashboard] Failed to fetch overview:', error);
      return fallback;
    }
  },

  /**
   * Fetch chart data for time-series visualization
   * All data points are calculated by backend
   */
  getCharts: async (options: DashboardQueryOptions = {}): Promise<DashboardCharts> => {
    const fallback = emptyCharts();
    
    try {
      const response = await api.get<DashboardCharts>('/core/dashboard/charts/', {
        params: buildParams({
          ...options,
          days: options.days || 7,
        }),
      });
      
      const data = response.data || fallback;
      
      // Validate structures
      if (!Array.isArray(data.messages_per_day) ||
          !Array.isArray(data.orders_per_day) ||
          !Array.isArray(data.conversations_per_day)) {
        console.warn('[Dashboard] Invalid charts response structure, using fallback');
        return fallback;
      }
      
      // Validate and transform data
      return {
        messages_per_day: data.messages_per_day.map((item): DailyMessageChart => ({
          date: String(item.date || ''),
          inbound: Number(item.inbound || 0),
          outbound: Number(item.outbound || 0),
          total: Number(item.total || 0),
        })),
        orders_per_day: data.orders_per_day.map((item): DailyOrderChart => ({
          date: String(item.date || ''),
          count: Number(item.count || 0),
          revenue: Number(item.revenue || 0),
        })),
        conversations_per_day: data.conversations_per_day.map((item): DailyConversationChart => ({
          date: String(item.date || ''),
          new: Number(item.new || 0),
          resolved: Number(item.resolved || 0),
        })),
        message_types: data.message_types || {},
        order_statuses: data.order_statuses || {},
      };
    } catch (error) {
      console.error('[Dashboard] Failed to fetch charts:', error);
      return fallback;
    }
  },

  /**
   * Fetch per-store revenue stats: today vs yesterday trend, low stock alerts.
   * Endpoint: GET /core/dashboard-stats/?store=<slug|id>
   */
  getStats: async (store: string): Promise<DashboardStats | null> => {
    try {
      const response = await api.get<DashboardStats>('/core/dashboard-stats/', {
        params: { store },
      });
      return response.data ?? null;
    } catch (error) {
      console.error('[Dashboard] Failed to fetch stats:', error);
      return null;
    }
  },

  /**
   * Fetch recent activity feed: latest messages, orders, conversations.
   * Endpoint: GET /core/dashboard/activity/
   */
  getActivity: async (options: DashboardQueryOptions & { limit?: number } = {}): Promise<DashboardActivity | null> => {
    try {
      const params: Record<string, string | number> = {};
      if (options.accountId) params.account_id = options.accountId;
      if (options.store) params.store = options.store;
      if (options.limit) params.limit = options.limit;
      const response = await api.get<DashboardActivity>('/core/dashboard/activity/', { params });
      return response.data ?? null;
    } catch (error) {
      console.error('[Dashboard] Failed to fetch activity:', error);
      return null;
    }
  },
};

export default dashboardService;
