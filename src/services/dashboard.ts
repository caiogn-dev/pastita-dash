import api from './api';

/**
 * Dashboard Service - API V2
 * ATUALIZADO: Usando /commerce/reports/ em vez de /stores/reports/
 */

export const dashboardService = {
  getOverview: async (storeSlug?: string) => {
    const params = storeSlug ? { store: storeSlug } : {};
    const [ordersRes, messagesRes] = await Promise.all([
      api.get('/commerce/reports/dashboard/', { params }).catch(() => ({ data: { orders_count: 0, revenue_total: 0 } })),
      api.get('/messaging/platform-accounts/', { params }).catch(() => ({ data: { count: 0 } })),
    ]);

    return {
      orders: {
        today: ordersRes.data.orders_count || 0,
        revenue_today: ordersRes.data.revenue_total || 0,
      },
      conversations: {
        active: ordersRes.data.active_conversations || 0,
      },
      messages: {
        today: ordersRes.data.messages_count || 0,
        delivered: ordersRes.data.messages_delivered || 0,
        read: ordersRes.data.messages_read || 0,
        failed: ordersRes.data.messages_failed || 0,
      },
    };
  },

  getCharts: async (storeSlug?: string, days = 7) => {
    // ATUALIZADO: Usando 'period' em vez de 'days' (o backend espera period: '7d', '30d', etc)
    const period = days === 7 ? '7d' : days === 30 ? '30d' : '7d';
    const params: any = { period };
    if (storeSlug) params.store = storeSlug;

    // Usando o endpoint de dashboard que existe no backend
    const response = await api.get('/commerce/reports/dashboard/', { params }).catch(() => ({ data: { daily_stats: [] } }));

    return {
      orders_per_day: response.data.daily_stats || [],
      messages_per_day: response.data.daily_stats || [],
    };
  },

  getOrderStats: async (params?: Record<string, string>) => {
    const response = await api.get('/commerce/reports/dashboard/', { params }).catch(() => ({
      data: { orders_count: 0, revenue_total: 0 }
    }));
    return {
      total: response.data.orders_count || 0,
      revenue: response.data.revenue_total || 0,
    };
  },

  getMessageStats: async (params?: Record<string, string>) => {
    const response = await api.get('/commerce/reports/dashboard/', { params }).catch(() => ({
      data: { messages_count: 0 }
    }));
    return {
      total: response.data.messages_count || 0,
    };
  },
};

export default dashboardService;
