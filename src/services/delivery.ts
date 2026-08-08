import api from './api';
import logger from './logger';
import { PaginatedResponse } from '../types';
import { getStoreSlugWithFallback } from '../hooks/useStore';
import { requireStoreSlug } from '../config/storeConfig';

export interface DeliveryZone {
  id: string;
  store?: string | null;
  store_name?: string | null;
  name: string;
  zone_type?: string;
  distance_band?: string | null;
  distance_label?: string | null;
  min_km?: number | null;
  max_km?: number | null;
  min_minutes?: number | null;
  max_minutes?: number | null;
  delivery_fee: number;
  fee_per_km?: number | null;
  estimated_days: number;
  estimated_minutes?: number;
  color?: string;
  polygon_coordinates?: number[][];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryZone {
  store?: string | null;
  name: string;
  zone_type?: string;
  distance_band?: string;
  min_km?: number | null;
  max_km?: number | null;
  min_minutes?: number | null;
  max_minutes?: number | null;
  delivery_fee: number;
  fee_per_km?: number | null;
  estimated_days?: number;
  estimated_minutes?: number;
  color?: string;
  polygon_coordinates?: number[][];
  is_active?: boolean;
}

export interface UpdateDeliveryZone {
  store?: string | null;
  name?: string;
  zone_type?: string;
  distance_band?: string;
  min_km?: number | null;
  max_km?: number | null;
  min_minutes?: number | null;
  max_minutes?: number | null;
  delivery_fee?: number;
  fee_per_km?: number | null;
  estimated_days?: number;
  estimated_minutes?: number;
  color?: string;
  polygon_coordinates?: number[][];
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
  store?: string;
  is_active?: boolean;
  zone_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

class DeliveryService {
  private baseUrl = '/stores/delivery-zones';
  private storeUrl = '/stores';
  /**
   * Slug da loja SELECIONADA.
   *
   * Era `requireStoreSlug(getStoreSlug())`, e `getStoreSlug()` é um stub morto
   * que só emite warn e devolve `null` — existe para empurrar quem chama para
   * o hook. Com `null`, o `requireStoreSlug` caía em `VITE_STORE_SLUG`, vazio
   * em produção multi-tenant, e LANÇAVA. O `getStoreLocation` engolia a
   * exceção e devolvia `null`, então a página de Zonas de Entrega concluía que
   * a loja não tinha endereço — e mostrava "Configurar Localização" para lojas
   * com endereço, CEP, latitude e longitude preenchidos.
   */
  private get storeSlug(): string { return requireStoreSlug(getStoreSlugWithFallback()); }

  async getZones(filters?: DeliveryZoneFilters): Promise<PaginatedResponse<DeliveryZone>> {
    const params = new URLSearchParams();
    
    // Store filter - critical for multi-store support
    if (filters?.store) {
      params.append('store', filters.store);
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
    }
    if (filters?.zone_type) {
      params.append('zone_type', filters.zone_type);
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

  async getStats(storeId?: string): Promise<DeliveryZoneStats> {
    const params = new URLSearchParams();
    if (storeId) {
      params.append('store', storeId);
    }
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/stats/?${queryString}` : `${this.baseUrl}/stats/`;
    const response = await api.get<DeliveryZoneStats>(url);
    return response.data;
  }

  async getStoreLocation(): Promise<StoreLocation | null> {
    try {
      // Use the store slug to get the store location
      // Endpoint: /commerce/{store_slug}/
      const response = await api.get<StoreLocation>(`${this.storeUrl}/${this.storeSlug}/`);
      if (response.data && Object.keys(response.data).length > 0) {
        return response.data as StoreLocation;
      }
      return null;
    } catch (error) {
      // `null` aqui significa "esta loja não tem localização cadastrada", e a
      // tela age em cima disso oferecendo "Configurar Localização".
      //
      // Falha de REDE ou de CONFIGURAÇÃO não é isso — e foi exatamente o que
      // aconteceu: o slug não resolvia, `requireStoreSlug` lançava, este catch
      // devolvia `null`, e a página acusava de "sem endereço" lojas que tinham
      // endereço, CEP e coordenadas. Erro de infra vestido de dado ausente é o
      // pior tipo, porque manda o usuário consertar o que não está quebrado.
      logger.error('Falha ao buscar a localização da loja', error);
      throw error;
    }
  }

  async updateStoreLocation(data: UpdateStoreLocation): Promise<StoreLocation> {
    // Use PATCH to update the store with the slug
    // Endpoint: /commerce/{store_slug}/
    const response = await api.patch<StoreLocation>(`${this.storeUrl}/${this.storeSlug}/`, data);
    return response.data;
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
