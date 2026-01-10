import api from './api';
import { PaginatedResponse } from '../types';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
  sku: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProduct {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  category?: string | null;
  sku: string;
  is_active?: boolean;
  image?: File | null;
}

export interface UpdateProduct extends Partial<CreateProduct> {}

export interface ProductFilters {
  search?: string;
  category?: string;
  is_active?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

const buildProductFormData = (data: CreateProduct | UpdateProduct): FormData => {
  const formData = new FormData();
  if (data.name !== undefined) formData.append('name', data.name);
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.stock_quantity !== undefined) formData.append('stock_quantity', String(data.stock_quantity));
  if (data.category !== undefined) formData.append('category', data.category || '');
  if (data.sku !== undefined) formData.append('sku', data.sku);
  if (data.is_active !== undefined) formData.append('is_active', String(data.is_active));
  if (data.image) formData.append('image', data.image);
  return formData;
};

class ProductsService {
  private baseUrl = '/ecommerce/admin/products';
  private categoriesUrl = '/ecommerce/products/categories';

  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/?${queryString}` : `${this.baseUrl}/`;
    const response = await api.get<PaginatedResponse<Product>>(url);
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await api.get<Product>(`${this.baseUrl}/${id}/`);
    return response.data;
  }

  async createProduct(data: CreateProduct): Promise<Product> {
    const formData = buildProductFormData(data);
    const response = await api.post<Product>(`${this.baseUrl}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateProduct(id: string, data: UpdateProduct): Promise<Product> {
    const formData = buildProductFormData(data);
    const response = await api.patch<Product>(`${this.baseUrl}/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}/`);
  }

  async getCategories(): Promise<string[]> {
    const response = await api.get<string[]>(`${this.categoriesUrl}/`);
    return response.data || [];
  }
}

export const productsService = new ProductsService();
export default productsService;
