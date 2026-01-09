import api from './api';
import { Order, OrderItem, OrderEvent, CreateOrder, PaginatedResponse } from '../types';

export const ordersService = {
  getOrders: async (params?: Record<string, string>): Promise<PaginatedResponse<Order>> => {
    const response = await api.get<PaginatedResponse<Order>>('/orders/', { params });
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${id}/`);
    return response.data;
  },

  createOrder: async (data: CreateOrder): Promise<Order> => {
    const response = await api.post<Order>('/orders/', data);
    return response.data;
  },

  updateOrder: async (id: string, data: Partial<Order>): Promise<Order> => {
    const response = await api.patch<Order>(`/orders/${id}/`, data);
    return response.data;
  },

  deleteOrder: async (id: string): Promise<void> => {
    await api.delete(`/orders/${id}/`);
  },

  confirmOrder: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/confirm/`);
    return response.data;
  },

  markAwaitingPayment: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/awaiting_payment/`);
    return response.data;
  },

  markPaid: async (id: string, paymentReference?: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/mark_paid/`, {
      payment_reference: paymentReference,
    });
    return response.data;
  },

  shipOrder: async (id: string, trackingCode?: string, carrier?: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/ship/`, {
      tracking_code: trackingCode,
      carrier: carrier,
    });
    return response.data;
  },

  deliverOrder: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/deliver/`);
    return response.data;
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/cancel/`, { reason });
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
    const response = await api.post<OrderItem>(`/orders/${id}/add_item/`, item);
    return response.data;
  },

  removeItem: async (orderId: string, itemId: string): Promise<void> => {
    await api.delete(`/orders/${orderId}/items/${itemId}/`);
  },

  updateShipping: async (
    id: string,
    shippingAddress: Record<string, unknown>,
    shippingCost?: number
  ): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/update_shipping/`, {
      shipping_address: shippingAddress,
      shipping_cost: shippingCost,
    });
    return response.data;
  },

  addNote: async (id: string, note: string, isInternal?: boolean): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/add_note/`, {
      note,
      is_internal: isInternal,
    });
    return response.data;
  },

  getEvents: async (id: string): Promise<OrderEvent[]> => {
    const response = await api.get<OrderEvent[]>(`/orders/${id}/events/`);
    return response.data;
  },

  getStats: async (accountId: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/orders/stats/', { params: { account_id: accountId } });
    return response.data;
  },

  getByCustomer: async (phone: string, accountId?: string): Promise<Order[]> => {
    const params: Record<string, string> = { phone };
    if (accountId) params.account_id = accountId;
    const response = await api.get<Order[]>('/orders/by_customer/', { params });
    return response.data;
  },
};
