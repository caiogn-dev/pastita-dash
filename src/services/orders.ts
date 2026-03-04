import api from './api';
import { Order, OrderItem, OrderEvent, CreateOrder, PaginatedResponse } from '../types';

/**
 * Orders Service - API V2
 * 
 * ATUALIZADO: Endpoint migrado de /commerce/ para /stores/ (2026-03-04)
 */

const getBaseUrl = (storeSlug?: string) => {
  if (storeSlug) {
    return `/stores/${storeSlug}/orders`;
  }
  return '/stores/orders';
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? Number(value) : value;
};

const normalizeOrder = (order: Order): Order => ({
  ...order,
  subtotal: toNumber(order.subtotal),
  discount: toNumber(order.discount),
  delivery_fee: order.delivery_fee !== undefined && order.delivery_fee !== null
    ? toNumber(order.delivery_fee)
    : order.delivery_fee,
  tax: toNumber(order.tax),
  total: toNumber(order.total),
  items_count: order.items_count ?? order.items?.length ?? 0,
});

export const ordersService = {
  getOrders: async (params?: Record<string, string> & { store_slug?: string }): Promise<PaginatedResponse<Order>> => {
    const storeSlug = params?.store_slug;
    const { store_slug, ...apiParams } = params || {};
    const response = await api.get<PaginatedResponse<Order>>(`${getBaseUrl(storeSlug)}/`, { params: apiParams });
    const results = response.data.results?.map(normalizeOrder) || [];
    return { ...response.data, results };
  },

  getOrder: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.get<Order>(`${getBaseUrl(storeSlug)}/${id}/`);
    return normalizeOrder(response.data);
  },

  createOrder: async (data: CreateOrder, storeSlug?: string): Promise<Order> => {
    const response = await api.post<Order>(`${getBaseUrl(storeSlug)}/`, data);
    return normalizeOrder(response.data);
  },

  updateOrder: async (id: string, data: Partial<Order>, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, data);
    return normalizeOrder(response.data);
  },

  deleteOrder: async (id: string, storeSlug?: string): Promise<void> => {
    await api.delete(`${getBaseUrl(storeSlug)}/${id}/`);
  },

  // Métodos de compatibilidade legado
  confirmOrder: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'confirmed' });
    return normalizeOrder(response.data);
  },

  startPreparing: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'preparing' });
    return normalizeOrder(response.data);
  },

  markReady: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'ready' });
    return normalizeOrder(response.data);
  },

  markOutForDelivery: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'out_for_delivery' });
    return normalizeOrder(response.data);
  },

  deliverOrder: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'delivered' });
    return normalizeOrder(response.data);
  },

  cancelOrder: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status: 'cancelled' });
    return normalizeOrder(response.data);
  },

  markPaid: async (id: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { payment_status: 'paid' });
    return normalizeOrder(response.data);
  },

  getByCustomer: async (customerId: string, storeSlug?: string): Promise<Order[]> => {
    const response = await api.get<PaginatedResponse<Order>>(`${getBaseUrl(storeSlug)}/`, { params: { customer: customerId } });
    return (response.data.results || []).map(normalizeOrder);
  },

  updateStatus: async (id: string, status: string, storeSlug?: string): Promise<Order> => {
    const response = await api.patch<Order>(`${getBaseUrl(storeSlug)}/${id}/`, { status });
    return normalizeOrder(response.data);
  },

  getPaymentStatus: async (id: string, storeSlug?: string): Promise<{ status: string; payment_url?: string }> => {
    const response = await api.get(`${getBaseUrl(storeSlug)}/${id}/payment/`);
    return response.data;
  },

  addEvent: async (orderId: string, event: { type: string; description: string }, storeSlug?: string): Promise<OrderEvent> => {
    const response = await api.post<OrderEvent>(`${getBaseUrl(storeSlug)}/${orderId}/events/`, event);
    return response.data;
  },

  getEvents: async (orderId: string, storeSlug?: string): Promise<OrderEvent[]> => {
    const response = await api.get<OrderEvent[]>(`${getBaseUrl(storeSlug)}/${orderId}/events/`);
    return response.data;
  },

  exportOrders: async (params?: Record<string, string> & { store_slug?: string }): Promise<Blob> => {
    const storeSlug = params?.store_slug;
    const { store_slug, ...apiParams } = params || {};
    const response = await api.get(`${getBaseUrl(storeSlug)}/export/`, {
      params: apiParams,
      responseType: 'blob',
    });
    return response.data;
  },

  getStats: async (params?: Record<string, string> & { store_slug?: string }): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  }> => {
    const storeSlug = params?.store_slug;
    const { store_slug, ...apiParams } = params || {};
    const response = await api.get(`${getBaseUrl(storeSlug)}/stats/`, { params: apiParams });
    return response.data;
  },
};

export default ordersService;
