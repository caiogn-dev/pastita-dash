/**
 * Unified API Service - Uses ONLY /stores/ API (unified system)
 * Provides a clean interface for dashboard to access store data
 */
import api from './api';
import { PaginatedResponse } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedOrder {
  id: string;
  store_id: string | null;
  store_name: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  delivery_method: string;
  delivery_address: Record<string, string>;
  items_count: number;
  source?: string;  // Order source (e.g., 'web', 'whatsapp', 'api')
  created_at: string;
  updated_at: string;
}

export interface UnifiedOrdersResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: UnifiedOrder[];
}

export interface UnifiedOrderStats {
  total_orders: number;
  total_revenue: number;
  orders_today: number;
  revenue_today: number;
  orders_period: number;
  revenue_period: number;
  average_order_value: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  daily_orders: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface UnifiedDashboardStats {
  orders: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    pending: number;
  };
  revenue: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
  };
  customers: {
    total: number;
    new_this_month: number;
  };
  products: {
    total: number;
    active: number;
    low_stock: number;
  };
}

export interface UnifiedOrderFilters {
  store?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// =============================================================================
// SERVICE - Uses ONLY /stores/ endpoints
// =============================================================================

const BASE_URL = '/stores';

class UnifiedApiService {
  async getOrders(filters?: UnifiedOrderFilters): Promise<UnifiedOrdersResponse> {
    const params = new URLSearchParams();
    
    if (filters?.store) params.append('store', filters.store);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('created_at__gte', filters.date_from);
    if (filters?.date_to) params.append('created_at__lte', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    
    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/orders/?${queryString}` : `${BASE_URL}/orders/`;
    
    const response = await api.get<UnifiedOrdersResponse>(url);
    return response.data;
  }

  async getOrderStats(storeId?: string, period?: 'today' | 'week' | 'month' | 'year'): Promise<UnifiedOrderStats> {
    const params = new URLSearchParams();
    
    if (storeId) params.append('store', storeId);
    if (period) params.append('period', period);
    
    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/orders/stats/?${queryString}` : `${BASE_URL}/orders/stats/`;
    
    const response = await api.get<UnifiedOrderStats>(url);
    return response.data;
  }

  async getDashboardStats(storeId?: string): Promise<UnifiedDashboardStats> {
    const params = new URLSearchParams();
    if (storeId) params.append('store', storeId);
    
    // Aggregate stats from multiple endpoints
    const [ordersRes, productsRes, customersRes] = await Promise.all([
      api.get(`${BASE_URL}/orders/stats/`, { params }),
      api.get(`${BASE_URL}/products/`, { params: { ...Object.fromEntries(params), page_size: '1' } }),
      api.get(`${BASE_URL}/customers/`, { params: { ...Object.fromEntries(params), page_size: '1' } }),
    ]);

    const orderStats = ordersRes.data;
    
    return {
      orders: {
        total: orderStats.total_orders || 0,
        today: orderStats.orders_today || 0,
        this_week: orderStats.orders_week || 0,
        this_month: orderStats.orders_month || 0,
        pending: orderStats.pending_orders || 0,
      },
      revenue: {
        total: orderStats.total_revenue || 0,
        today: orderStats.revenue_today || 0,
        this_week: orderStats.revenue_week || 0,
        this_month: orderStats.revenue_month || 0,
      },
      customers: {
        total: customersRes.data.count || 0,
        new_this_month: 0,
      },
      products: {
        total: productsRes.data.count || 0,
        active: 0,
        low_stock: 0,
      },
    };
  }

  async getOrder(orderId: string): Promise<UnifiedOrder> {
    const response = await api.get<UnifiedOrder>(`${BASE_URL}/orders/${orderId}/`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string, data?: Record<string, unknown>): Promise<UnifiedOrder> {
    const response = await api.post<UnifiedOrder>(`${BASE_URL}/orders/${orderId}/update_status/`, {
      status,
      ...data,
    });
    return response.data;
  }

  async confirmOrder(orderId: string): Promise<UnifiedOrder> {
    return this.updateOrderStatus(orderId, 'confirmed');
  }

  async prepareOrder(orderId: string): Promise<UnifiedOrder> {
    return this.updateOrderStatus(orderId, 'preparing');
  }

  async shipOrder(orderId: string, trackingCode?: string, carrier?: string): Promise<UnifiedOrder> {
    const response = await api.post<UnifiedOrder>(`${BASE_URL}/orders/${orderId}/add_tracking/`, {
      tracking_code: trackingCode,
      carrier,
    });
    return response.data;
  }

  async deliverOrder(orderId: string): Promise<UnifiedOrder> {
    return this.updateOrderStatus(orderId, 'delivered');
  }

  async markPaid(orderId: string, paymentReference?: string): Promise<UnifiedOrder> {
    const response = await api.post<UnifiedOrder>(`${BASE_URL}/orders/${orderId}/mark_paid/`, {
      payment_reference: paymentReference,
    });
    return response.data;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<UnifiedOrder> {
    const response = await api.post<UnifiedOrder>(`${BASE_URL}/orders/${orderId}/cancel/`, { reason });
    return response.data;
  }

  async getOrdersByCustomer(phone: string, storeId?: string): Promise<UnifiedOrdersResponse> {
    return this.getOrders({ search: phone, store: storeId });
  }
}

export const unifiedApi = new UnifiedApiService();
export default unifiedApi;
