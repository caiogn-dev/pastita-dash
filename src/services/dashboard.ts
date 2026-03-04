import api from './api';

/**
 * Dashboard Service - API V2
 * ATUALIZADO: Usando /stores/reports/ (backend migrado - 2026-03-04)
 * ATUALIZADO: Sempre envia store parameter (obrigatório no backend)
 */

const DEFAULT_STORE = 'pastita';

export const dashboardService = {
  getOverview: async (storeSlug?: string) => {
    const store = storeSlug || DEFAULT_STORE;
    const params = { store };
    const [ordersRes, messagesRes] = await Promise.all([
      api.get('/stores/reports/dashboard/', { params }).catch(() => ({ data: { orders_count: 0, revenue_total: 0 } })),
      api.get('/messaging/messenger/accounts/', { params }).catch(() => ({ data: { count: 0 } })),
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
    const store = storeSlug || DEFAULT_STORE;
    const period = days === 7 ? '7d' : days === 30 ? '30d' : '7d';
    const params = { store, period };

    const response = await api.get('/stores/reports/dashboard/', { params }).catch(() => ({ data: { daily_stats: [] } }));

    return {
      orders_per_day: response.data.daily_stats || [],
      messages_per_day: response.data.daily_stats || [],
    };
  },

  getOrderStats: async (storeSlug?: string) => {
    const store = storeSlug || DEFAULT_STORE;
    const response = await api.get('/stores/reports/dashboard/', { params: { store } }).catch(() => ({
      data: { orders_count: 0, revenue_total: 0 }
    }));
    return {
      total: response.data.orders_count || 0,
      revenue: response.data.revenue_total || 0,
    };
  },

  getMessageStats: async (storeSlug?: string) => {
    const store = storeSlug || DEFAULT_STORE;
    const response = await api.get('/stores/reports/dashboard/', { params: { store } }).catch(() => ({
      data: { messages_count: 0 }
    }));
    return {
      total: response.data.messages_count || 0,
    };
  },
};

export default dashboardService;
