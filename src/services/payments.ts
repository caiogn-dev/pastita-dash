import api from './api';
import { Payment, PaymentGateway, PaginatedResponse } from '../types';

export const paymentsService = {
  // Payments
  getPayments: async (params?: Record<string, string>): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get<PaginatedResponse<Payment>>('/payments/', { params });
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${id}/`);
    return response.data;
  },

  createPayment: async (data: {
    order_id: string;
    gateway_id?: string;
    amount: number;
    payment_method?: string;
    payer_email?: string;
    payer_name?: string;
    payer_document?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Payment> => {
    const response = await api.post<Payment>('/payments/', data);
    return response.data;
  },

  processPayment: async (id: string, gatewayType?: string): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/process/`, {
      gateway_type: gatewayType,
    });
    return response.data;
  },

  confirmPayment: async (
    id: string,
    externalId?: string,
    gatewayResponse?: Record<string, unknown>
  ): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/confirm/`, {
      external_id: externalId,
      gateway_response: gatewayResponse,
    });
    return response.data;
  },

  failPayment: async (
    id: string,
    errorCode: string,
    errorMessage: string,
    gatewayResponse?: Record<string, unknown>
  ): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/fail/`, {
      error_code: errorCode,
      error_message: errorMessage,
      gateway_response: gatewayResponse,
    });
    return response.data;
  },

  cancelPayment: async (id: string): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/cancel/`);
    return response.data;
  },

  refundPayment: async (id: string, amount?: number, reason?: string): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${id}/refund/`, {
      amount,
      reason,
    });
    return response.data;
  },

  getByOrder: async (orderId: string): Promise<Payment[]> => {
    const response = await api.get<Payment[]>('/payments/by_order/', {
      params: { order_id: orderId },
    });
    return response.data;
  },

  // Gateways
  getGateways: async (params?: Record<string, string>): Promise<PaginatedResponse<PaymentGateway>> => {
    const response = await api.get<PaginatedResponse<PaymentGateway>>('/payments/gateways/', { params });
    return response.data;
  },

  getGateway: async (id: string): Promise<PaymentGateway> => {
    const response = await api.get<PaymentGateway>(`/payments/gateways/${id}/`);
    return response.data;
  },

  createGateway: async (data: {
    name: string;
    gateway_type: string;
    is_enabled?: boolean;
    is_sandbox?: boolean;
    api_key?: string;
    api_secret?: string;
    webhook_secret?: string;
    endpoint_url?: string;
    configuration?: Record<string, unknown>;
  }): Promise<PaymentGateway> => {
    const response = await api.post<PaymentGateway>('/payments/gateways/', data);
    return response.data;
  },

  updateGateway: async (id: string, data: Partial<PaymentGateway>): Promise<PaymentGateway> => {
    const response = await api.patch<PaymentGateway>(`/payments/gateways/${id}/`, data);
    return response.data;
  },

  deleteGateway: async (id: string): Promise<void> => {
    await api.delete(`/payments/gateways/${id}/`);
  },
};
