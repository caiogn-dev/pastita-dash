import api from './api';
import { Order, OrderItem, OrderEvent, CreateOrder, PaginatedResponse } from '../types';

/**
 * Orders Service - Uses ONLY /stores/orders/ API (unified system)
 * No legacy fallbacks - all orders go through the stores system
 */

const BASE_URL = '/stores/orders';

export const ordersService = {
  getOrders: async (params?: Record<string, string>): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<PaginatedResponse<Order>>(`${BASE_URL}/`, { params });
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`${BASE_URL}/${id}/`);
    return response.data;
  },

  createOrder: async (data: CreateOrder): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/`, data);
    return response.data;
  },

  updateOrder: async (id: string, data: Partial<Order>): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, data);
    return response.data;
  },

  deleteOrder: async (id: string): Promise<void> => {
    await api.delete(`${BASE_URL}/${id}/`);
  },

  confirmOrder: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'confirmed' });
    return response.data;
  },

  markAwaitingPayment: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'awaiting_payment' });
    return response.data;
  },

  markPaid: async (id: string, paymentReference?: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/mark_paid/`, {
      payment_reference: paymentReference,
    });
    return response.data;
  },

  shipOrder: async (id: string, trackingCode?: string, carrier?: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/add_tracking/`, {
      tracking_code: trackingCode,
      carrier: carrier,
    });
    return response.data;
  },

  deliverOrder: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'delivered' });
    return response.data;
  },

  startProcessing: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'processing' });
    return response.data;
  },

  startPreparing: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'preparing' });
    return response.data;
  },

  markReady: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'ready' });
    return response.data;
  },

  markOutForDelivery: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/update_status/`, { status: 'out_for_delivery' });
    return response.data;
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/cancel/`, { reason });
    return response.data;
  },

  addItem: async (
    id: string,
    item: {
      product_name: string;
      product_id?: string;
      product_sku?: string;
      quantity: number;
      unit_price: number;
      notes?: string;
    }
  ): Promise<OrderItem> => {
    const response = await api.post<OrderItem>(`${BASE_URL}/${id}/add_item/`, item);
    return response.data;
  },

  removeItem: async (orderId: string, itemId: string): Promise<void> => {
    await api.delete(`${BASE_URL}/${orderId}/items/${itemId}/`);
  },

  updateShipping: async (
    id: string,
    shippingAddress: Record<string, unknown>,
    shippingCost?: number
  ): Promise<Order> => {
    const response = await api.patch<Order>(`${BASE_URL}/${id}/`, {
      delivery_address: shippingAddress,
      delivery_fee: shippingCost,
    });
    return response.data;
  },

  addNote: async (id: string, note: string, isInternal?: boolean): Promise<Order> => {
    const response = await api.post<Order>(`${BASE_URL}/${id}/add_note/`, {
      note,
      is_internal: isInternal,
    });
    return response.data;
  },

  getEvents: async (id: string): Promise<OrderEvent[]> => {
    const response = await api.get<OrderEvent[]>(`${BASE_URL}/${id}/history/`);
    return response.data;
  },

  getStats: async (storeId?: string): Promise<Record<string, unknown>> => {
    const params: Record<string, string> = {};
    if (storeId) params.store = storeId;
    const response = await api.get(`${BASE_URL}/stats/`, { params });
    return response.data;
  },

  getByCustomer: async (phone: string, storeId?: string): Promise<Order[]> => {
    const params: Record<string, string> = { customer_phone: phone };
    if (storeId) params.store = storeId;
    const response = await api.get<PaginatedResponse<Order>>(`${BASE_URL}/`, { params });
    return response.data.results || [];
  },
};
