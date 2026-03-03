import api from './api';

/**
 * Dashboard Service - API V2
 */

export const dashboardService = {
  getOverview: async (accountId?: string) => {
    const params = accountId ? { account: accountId } : {};
    const [ordersRes, messagesRes] = await Promise.all([
      api.get('/commerce/orders/stats/', { params }).catch(() => ({ data: { count: 0, revenue: 0 } })),
      api.get('/messaging/stats/', { params }).catch(() => ({ data: { total: 0 } })),
    ]);

    return {
      orders: {
        today: ordersRes.data.count || 0,
        revenue_today: ordersRes.data.revenue || 0,
      },
      conversations: {
        active: messagesRes.data.active_conversations || 0,
      },
      messages: {
        today: messagesRes.data.total || 0,
        delivered: messagesRes.data.delivered || 0,
        read: messagesRes.data.read || 0,
        failed: messagesRes.data.failed || 0,
      },
    };
  },

  getCharts: async (accountId?: string, days = 7) => {
    const params: any = { days };
    if (accountId) params.account = accountId;

    const [ordersRes, messagesRes] = await Promise.all([
      api.get('/commerce/orders/charts/', { params }).catch(() => ({ data: { daily: [] } })),
      api.get('/messaging/charts/', { params }).catch(() => ({ data: { daily: [] } })),
    ]);

    return {
      orders_per_day: ordersRes.data.daily || [],
      messages_per_day: messagesRes.data.daily || [],
    };
  },

  getOrderStats: async (params?: Record<string, string>) => {
    const response = await api.get('/commerce/orders/stats/', { params }).catch(() => ({
      data: { total: 0, pending: 0, confirmed: 0, delivered: 0, cancelled: 0, revenue: 0 }
    }));
    return response.data;
  },

  getMessageStats: async (params?: Record<string, string>) => {
    const response = await api.get('/messaging/stats/', { params }).catch(() => ({
      data: { total: 0, sent: 0, delivered: 0, failed: 0 }
    }));
    return response.data;
  },
};

export default dashboardService;
