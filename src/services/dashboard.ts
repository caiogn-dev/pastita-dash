import api from './api';

interface DashboardQueryOptions {
  accountId?: string;
  store?: string;
  days?: number;
}

const buildParams = (options: DashboardQueryOptions = {}) => {
  const params: Record<string, string | number> = {};

  if (options.accountId) {
    params.account_id = options.accountId;
  }

  if (options.store) {
    params.store = options.store;
  }

  if (typeof options.days === 'number') {
    params.days = options.days;
  }

  return params;
};

const emptyOverview = () => ({
  accounts: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  messages: {
    today: 0,
    week: 0,
    month: 0,
    by_status: {} as Record<string, number>,
    by_direction: {} as Record<string, number>,
  },
  conversations: {
    active: 0,
    by_status: {} as Record<string, number>,
    by_mode: {} as Record<string, number>,
    resolved_today: 0,
  },
  orders: {
    today: 0,
    by_status: {} as Record<string, number>,
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
  timestamp: null as string | null,
});

const emptyCharts = () => ({
  messages_per_day: [] as Array<{ date: string; inbound: number; outbound: number; total: number }>,
  orders_per_day: [] as Array<{ date: string; count: number; revenue: number }>,
  conversations_per_day: [] as Array<{ date: string; new: number; resolved: number }>,
  message_types: {} as Record<string, number>,
  order_statuses: {} as Record<string, number>,
});

export const dashboardService = {
  getOverview: async (options: DashboardQueryOptions = {}) => {
    const fallback = emptyOverview();
    const response = await api
      .get('/core/dashboard/overview/', { params: buildParams(options) })
      .catch(() => ({ data: fallback }));

    const data = response.data || fallback;

    return {
      accounts: {
        total: Number(data.accounts?.total || 0),
        active: Number(data.accounts?.active || 0),
        inactive: Number(data.accounts?.inactive || 0),
      },
      messages: {
        today: Number(data.messages?.today || 0),
        week: Number(data.messages?.week || 0),
        month: Number(data.messages?.month || 0),
        by_status: data.messages?.by_status || {},
        by_direction: data.messages?.by_direction || {},
      },
      conversations: {
        active: Number(data.conversations?.active || 0),
        by_status: data.conversations?.by_status || {},
        by_mode: data.conversations?.by_mode || {},
        resolved_today: Number(data.conversations?.resolved_today || 0),
      },
      orders: {
        today: Number(data.orders?.today || 0),
        by_status: data.orders?.by_status || {},
        revenue_today: Number(data.orders?.revenue_today || 0),
        revenue_month: Number(data.orders?.revenue_month || 0),
      },
      payments: {
        pending: Number(data.payments?.pending || 0),
        completed_today: Number(data.payments?.completed_today || 0),
      },
      agents: {
        interactions_today: Number(data.agents?.interactions_today || 0),
        avg_duration_ms: Number(data.agents?.avg_duration_ms || 0),
      },
      timestamp: data.timestamp || null,
    };
  },

  getCharts: async (options: DashboardQueryOptions = {}) => {
    const fallback = emptyCharts();
    const response = await api
      .get('/core/dashboard/charts/', {
        params: buildParams({
          ...options,
          days: options.days || 7,
        }),
      })
      .catch(() => ({ data: fallback }));

    const data = response.data || fallback;

    return {
      messages_per_day: Array.isArray(data.messages_per_day)
        ? data.messages_per_day.map((item: Record<string, unknown>) => ({
            date: String(item.date || ''),
            inbound: Number(item.inbound || 0),
            outbound: Number(item.outbound || 0),
            total: Number(item.total || 0),
          }))
        : [],
      orders_per_day: Array.isArray(data.orders_per_day)
        ? data.orders_per_day.map((item: Record<string, unknown>) => ({
            date: String(item.date || ''),
            count: Number(item.count || 0),
            revenue: Number(item.revenue || 0),
          }))
        : [],
      conversations_per_day: Array.isArray(data.conversations_per_day)
        ? data.conversations_per_day.map((item: Record<string, unknown>) => ({
            date: String(item.date || ''),
            new: Number(item.new || 0),
            resolved: Number(item.resolved || 0),
          }))
        : [],
      message_types: data.message_types || {},
      order_statuses: data.order_statuses || {},
    };
  },

  getOrderStats: async (options: DashboardQueryOptions = {}) => {
    const response = await dashboardService.getOverview(options);
    return {
      total: response.orders.today || 0,
      revenue: response.orders.revenue_today || 0,
    };
  },

  getMessageStats: async (options: DashboardQueryOptions = {}) => {
    const response = await dashboardService.getOverview(options);
    return {
      total: response.messages.today || 0,
    };
  },
};

export default dashboardService;
