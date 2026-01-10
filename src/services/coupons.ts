import api from './api';
import { PaginatedResponse } from '../types';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  is_valid_now: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCoupon {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  valid_from: string;
  valid_until: string;
}

export interface UpdateCoupon {
  code?: string;
  description?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  min_purchase?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface CouponStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  total_usage: number;
}

export interface CouponFilters {
  is_active?: boolean;
  discount_type?: 'percentage' | 'fixed';
  search?: string;
  page?: number;
  page_size?: number;
}

class CouponsService {
  private baseUrl = '/ecommerce/admin/coupons';

  async getCoupons(filters?: CouponFilters): Promise<PaginatedResponse<Coupon>> {
    const params = new URLSearchParams();
    
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
    }
    if (filters?.discount_type) {
      params.append('discount_type', filters.discount_type);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size));
    }

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/?${queryString}` : `${this.baseUrl}/`;
    
    const response = await api.get<PaginatedResponse<Coupon>>(url);
    return response.data;
  }

  async getCoupon(id: string): Promise<Coupon> {
    const response = await api.get<Coupon>(`${this.baseUrl}/${id}/`);
    return response.data;
  }

  async createCoupon(data: CreateCoupon): Promise<Coupon> {
    const response = await api.post<Coupon>(`${this.baseUrl}/`, data);
    return response.data;
  }

  async updateCoupon(id: string, data: UpdateCoupon): Promise<Coupon> {
    const response = await api.patch<Coupon>(`${this.baseUrl}/${id}/`, data);
    return response.data;
  }

  async deleteCoupon(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}/`);
  }

  async toggleActive(id: string): Promise<Coupon> {
    const response = await api.post<Coupon>(`${this.baseUrl}/${id}/toggle_active/`);
    return response.data;
  }

  async getStats(): Promise<CouponStats> {
    const response = await api.get<CouponStats>(`${this.baseUrl}/stats/`);
    return response.data;
  }
}

export const couponsService = new CouponsService();
export default couponsService;
