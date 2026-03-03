import api from './api';
import { Order, OrderItem, OrderEvent, CreateOrder, PaginatedResponse } from '../types';

/**
 * Orders Service - API V2
 */

const BASE_URL = '/commerce/orders';

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
  getOrders: async (params?: Record<string, string>): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<PaginatedResponse<Order>>(`${BASE_URL}/`, { params });
    const results = response.data.results?.map(normalizeOrder) || [];
    return { ...response.data, results };
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`${BASE_URL}/${id}/`);
    return normalizeOrder(response.data);
  },

  createOrder: async (data: CreateOrder): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/`, data);
    return normalizeOrder(response.data);
  },

  updateOrder: async (id: string, data: Partial<Order>): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, data);
    return normalizeOrder(response.data);
  },

  deleteOrder: async (id: string): Promise<void> => {
    await api.delete(`${BASE_URL}/${id}/`);
  },

  // Métodos de compatibilidade legado
  confirmOrder: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'confirmed' });
    return normalizeOrder(response.data);
  },

  startPreparing: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'preparing' });
    return normalizeOrder(response.data);
  },

  markReady: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'ready' });
    return normalizeOrder(response.data);
  },

  markOutForDelivery: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'out_for_delivery' });
    return normalizeOrder(response.data);
  },

  deliverOrder: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'delivered' });
    return normalizeOrder(response.data);
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status: 'cancelled' });
    return normalizeOrder(response.data);
  },

  markPaid: async (id: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { payment_status: 'paid' });
    return normalizeOrder(response.data);
  },

  getByCustomer: async (customerId: string): Promise<Order[]> => {
    const response = await api.get<PaginatedResponse<Order>>(`${BASE_URL}/`, { params: { customer: customerId } });
    return (response.data.results || []).map(normalizeOrder);
  },

  updateStatus: async (id: string, status: string): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, { status });
    return normalizeOrder(response.data);
  },

  getPaymentStatus: async (id: string): Promise<{ status: string; payment_url?: string }> => {
    const response = await api.get(`${BASE_URL}/${id}/payment/`);
    return response.data;
  },

  addEvent: async (orderId: string, event: { type: string; description: string }): Promise<OrderEvent> => {
    const response = await api.post<OrderEvent>(`${BASE_URL}/${orderId}/events/`, event);
    return response.data;
  },

  getEvents: async (orderId: string): Promise<OrderEvent[]> => {
    const response = await api.get<OrderEvent[]>(`${BASE_URL}/${orderId}/events/`);
    return response.data;
  },

  exportOrders: async (params?: Record<string, string>): Promise<Blob> => {
    const response = await api.get(`${BASE_URL}/export/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getStats: async (params?: Record<string, string>): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  }> => {
    const response = await api.get(`${BASE_URL}/stats/`, { params });
    return response.data;
  },
};

export default ordersService;
