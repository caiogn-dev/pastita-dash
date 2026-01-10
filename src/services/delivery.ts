import api from './api';
import { PaginatedResponse } from '../types';

export interface DeliveryZone {
  id: string;
  name: string;
  zip_code_start?: string | null;
  zip_code_end?: string | null;
  min_km?: number | null;
  max_km?: number | null;
  delivery_fee: number;
  min_fee?: number | null;
  estimated_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryZone {
  name: string;
  zip_code_start?: string | null;
  zip_code_end?: string | null;
  min_km?: number | null;
  max_km?: number | null;
  delivery_fee: number;
  min_fee?: number | null;
  estimated_days?: number;
  is_active?: boolean;
}

export interface UpdateDeliveryZone {
  name?: string;
  zip_code_start?: string | null;
  zip_code_end?: string | null;
  min_km?: number | null;
  max_km?: number | null;
  delivery_fee?: number;
  min_fee?: number | null;
  estimated_days?: number;
  is_active?: boolean;
}

export interface DeliveryZoneStats {
  total: number;
  active: number;
  inactive: number;
  avg_fee: number;
  avg_days: number;
}

export interface StoreLocation {
  id: string;
  name: string;
  zip_code: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateStoreLocation {
  name?: string;
  zip_code: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface DeliveryZoneFilters {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

class DeliveryService {
  private baseUrl = '/ecommerce/admin/delivery-zones';
  private storeUrl = '/ecommerce/admin/store-location';

  async getZones(filters?: DeliveryZoneFilters): Promise<PaginatedResponse<DeliveryZone>> {
    const params = new URLSearchParams();
    
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
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
    
    const response = await api.get<PaginatedResponse<DeliveryZone>>(url);
    return response.data;
  }

  async getZone(id: string): Promise<DeliveryZone> {
    const response = await api.get<DeliveryZone>(`${this.baseUrl}/${id}/`);
    return response.data;
  }

  async createZone(data: CreateDeliveryZone): Promise<DeliveryZone> {
    const response = await api.post<DeliveryZone>(`${this.baseUrl}/`, data);
    return response.data;
  }

  async updateZone(id: string, data: UpdateDeliveryZone): Promise<DeliveryZone> {
    const response = await api.patch<DeliveryZone>(`${this.baseUrl}/${id}/`, data);
    return response.data;
  }

  async deleteZone(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}/`);
  }

  async toggleActive(id: string): Promise<DeliveryZone> {
    const response = await api.post<DeliveryZone>(`${this.baseUrl}/${id}/toggle_active/`);
    return response.data;
  }

  async getStats(): Promise<DeliveryZoneStats> {
    const response = await api.get<DeliveryZoneStats>(`${this.baseUrl}/stats/`);
    return response.data;
  }

  async getStoreLocation(): Promise<StoreLocation | null> {
    const response = await api.get<StoreLocation | Record<string, never>>(`${this.storeUrl}/`);
    if (response.data && Object.keys(response.data).length > 0) {
      return response.data as StoreLocation;
    }
    return null;
  }

  async updateStoreLocation(data: UpdateStoreLocation): Promise<StoreLocation> {
    const response = await api.post<StoreLocation>(`${this.storeUrl}/`, data);
    return response.data;
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
