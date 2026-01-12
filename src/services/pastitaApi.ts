/**
 * Pastita API Service
 * Uses the unified stores API: /stores/
 * All endpoints filter by store=pastita
 */

import api from './api';
import logger from './logger';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const STORES_BASE = '/stores';

// =============================================================================
// TYPES
// =============================================================================

export interface Produto {
  id: number;
  name: string;
  description: string;
  price: string | number;
  sale_price: string | number | null;
  image: string | null;
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  category: number | null;
  category_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Legacy aliases
  nome: string;
  descricao: string;
  preco: string | number;
  imagem: string | null;
  ativo: boolean;
  destaque?: boolean;
  quantidade?: string | number;
  tipo?: string;
  tipo_display?: string;
  message?: string;
  [key: string]: any;
}

export interface Molho extends Produto {
  tipo: string;
  quantidade: string | number;
}

export interface Carne extends Produto {
  tipo: string;
  quantidade: string | number;
  molhos?: number[];
  molhos_compativeis?: Molho[] | number[];
}

export interface Rondelli extends Produto {
  categoria: string;
  categoria_display?: string;
  sabor: string;
  sabor_display?: string;
  is_gourmet: boolean;
  quantidade: string | number;
}

export interface Combo extends Produto {
  items?: ComboItem[];
  preco_original?: string | number | null;
  quantidade_pessoas?: number;
  molhos?: number[];
  molhos_inclusos?: Molho[] | number[];
  carne?: number | null;
  carne_inclusa?: Carne | null;
  rondelli?: number | null;
  rondelli_incluso?: Rondelli | null;
}

export interface ComboItem {
  product_id: number;
  quantity: number;
}

// Input types for create/update (flexible to accept any fields)
export interface MolhoInput {
  nome: string;
  descricao?: string;
  preco: number | string;
  tipo?: string;
  quantidade?: string;
  ativo?: boolean;
  [key: string]: any;
}

export interface CarneInput {
  nome: string;
  descricao?: string;
  preco: number | string;
  tipo?: string;
  quantidade?: string;
  ativo?: boolean;
  molhos?: number[];
  molhos_compativeis?: number[];
  [key: string]: any;
}

export interface RondelliInput {
  nome: string;
  descricao?: string;
  preco: number | string;
  categoria?: string;
  sabor?: string;
  is_gourmet?: boolean;
  quantidade?: string;
  ativo?: boolean;
  [key: string]: any;
}

export interface ComboInput {
  nome: string;
  descricao?: string;
  preco: number | string;
  preco_original?: number | string | null;
  quantidade_pessoas?: number;
  ativo?: boolean;
  destaque?: boolean;
  items?: ComboItem[];
  molhos_inclusos?: number[];
  carne_inclusa?: number | null;
  rondelli_incluso?: number | null;
  [key: string]: any;
}

export interface PedidoEndereco {
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Pedido {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  delivery_method: string;
  subtotal: string;
  delivery_fee: string;
  discount: string;
  total: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_number: string;
  delivery_complement: string;
  delivery_neighborhood: string;
  delivery_city: string;
  delivery_state: string;
  delivery_zip: string;
  notes: string;
  items: PedidoItem[];
  created_at: string;
  updated_at: string;
  // Legacy aliases
  numero?: string;
  status_pagamento?: string;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  endereco_entrega?: PedidoEndereco;
  taxa_entrega?: string;
  desconto?: string;
  observacoes?: string;
  criado_em?: string;
  itens?: PedidoItem[];
}

export interface PedidoItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_products: number;
}

// =============================================================================
// HELPER - Normalize product data
// =============================================================================

function normalizeProduct(p: any): Produto {
  return {
    ...p,
    // Legacy aliases
    nome: p.name || p.nome || '',
    descricao: p.description || p.descricao || '',
    preco: p.price || p.preco || '0',
    imagem: p.image || p.imagem || null,
    ativo: p.is_active ?? p.ativo ?? true,
    destaque: p.is_featured ?? p.destaque ?? false,
    quantidade: p.stock_quantity?.toString() || p.quantidade || '0',
    tipo: p.metadata?.tipo || p.tipo || '',
    tipo_display: p.metadata?.tipo_display || p.tipo_display || '',
    categoria: p.metadata?.categoria || p.categoria || '',
    categoria_display: p.metadata?.categoria_display || p.categoria_display || '',
    sabor: p.metadata?.sabor || p.sabor || '',
    sabor_display: p.metadata?.sabor_display || p.sabor_display || '',
    is_gourmet: p.metadata?.is_gourmet ?? p.is_gourmet ?? false,
    preco_original: p.sale_price || p.preco_original || null,
    quantidade_pessoas: p.metadata?.quantidade_pessoas || p.quantidade_pessoas || 0,
  };
}

function normalizeOrder(o: any): Pedido {
  // delivery_address is a JSON object from the API
  const addr = o.delivery_address || {};
  
  return {
    ...o,
    // Legacy aliases
    numero: o.order_number,
    status_pagamento: o.payment_status,
    cliente_nome: o.customer_name,
    cliente_email: o.customer_email,
    cliente_telefone: o.customer_phone,
    taxa_entrega: o.delivery_fee,
    desconto: o.discount,
    observacoes: o.customer_notes || o.delivery_notes,
    criado_em: o.created_at,
    itens: o.items,
    endereco_entrega: addr && Object.keys(addr).length > 0 ? {
      rua: addr.street || addr.rua || addr.address || '',
      numero: addr.number || addr.numero || '',
      complemento: addr.complement || addr.complemento || '',
      bairro: addr.neighborhood || addr.bairro || '',
      cidade: addr.city || addr.cidade || '',
      estado: addr.state || addr.estado || '',
      cep: addr.zip || addr.cep || addr.zipcode || '',
    } : null,
  };
}

// =============================================================================
// PRODUCTS (Generic)
// =============================================================================

export async function getProducts(params: Record<string, any> = {}): Promise<Produto[]> {
  try {
    const response = await api.get(`${STORES_BASE}/products/`, {
      params: { store: STORE_SLUG, ...params }
    });
    const results = response.data.results || response.data;
    return results.map(normalizeProduct);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/products/`, error);
    throw error;
  }
}

export async function getProduct(id: number): Promise<Produto> {
  try {
    const response = await api.get(`${STORES_BASE}/products/${id}/`);
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/products/${id}/`, error);
    throw error;
  }
}

export async function createProduct(data: Partial<Produto>): Promise<Produto> {
  try {
    const payload = {
      store: STORE_SLUG,
      name: data.nome || data.name,
      description: data.descricao || data.description,
      price: data.preco || data.price,
      sale_price: data.sale_price,
      is_active: data.ativo ?? data.is_active ?? true,
      is_featured: data.is_featured ?? false,
      category: data.category,
      sort_order: data.sort_order ?? 0,
    };
    const response = await api.post(`${STORES_BASE}/products/`, payload);
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/products/`, error, data);
    throw error;
  }
}

export async function updateProduct(id: number, data: Partial<Produto>): Promise<Produto> {
  try {
    const payload: any = {};
    if (data.nome !== undefined || data.name !== undefined) payload.name = data.nome || data.name;
    if (data.descricao !== undefined || data.description !== undefined) payload.description = data.descricao || data.description;
    if (data.preco !== undefined || data.price !== undefined) payload.price = data.preco || data.price;
    if (data.sale_price !== undefined) payload.sale_price = data.sale_price;
    if (data.ativo !== undefined || data.is_active !== undefined) payload.is_active = data.ativo ?? data.is_active;
    if (data.is_featured !== undefined) payload.is_featured = data.is_featured;
    if (data.category !== undefined) payload.category = data.category;
    if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
    
    const response = await api.patch(`${STORES_BASE}/products/${id}/`, payload);
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/products/${id}/`, error, data);
    throw error;
  }
}

export async function deleteProduct(id: number): Promise<void> {
  try {
    await api.delete(`${STORES_BASE}/products/${id}/`);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/products/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// MOLHOS (filter by category)
// =============================================================================

export async function getMolhos(params: Record<string, any> = {}): Promise<Molho[]> {
  return getProducts({ category__slug: 'molhos', ...params }) as Promise<Molho[]>;
}

export async function getMolho(id: number): Promise<Molho> {
  return getProduct(id) as Promise<Molho>;
}

export async function createMolho(data: any): Promise<Molho> {
  return createProduct(data) as Promise<Molho>;
}

export async function updateMolho(id: number, data: any): Promise<Molho> {
  return updateProduct(id, data) as Promise<Molho>;
}

export async function deleteMolho(id: number): Promise<void> {
  return deleteProduct(id);
}

// =============================================================================
// CARNES (filter by category)
// =============================================================================

export async function getCarnes(params: Record<string, any> = {}): Promise<Carne[]> {
  return getProducts({ category__slug: 'carnes', ...params }) as Promise<Carne[]>;
}

export async function getCarne(id: number): Promise<Carne> {
  return getProduct(id) as Promise<Carne>;
}

export async function createCarne(data: any): Promise<Carne> {
  return createProduct(data) as Promise<Carne>;
}

export async function updateCarne(id: number, data: any): Promise<Carne> {
  return updateProduct(id, data) as Promise<Carne>;
}

export async function deleteCarne(id: number): Promise<void> {
  return deleteProduct(id);
}

// =============================================================================
// RONDELLIS (filter by category)
// =============================================================================

export async function getRondellis(params: Record<string, any> = {}): Promise<Rondelli[]> {
  return getProducts({ category__slug: 'rondellis', ...params }) as Promise<Rondelli[]>;
}

export async function getRondellisClassicos(): Promise<Rondelli[]> {
  const all = await getRondellis();
  return all.filter(r => !r.is_gourmet);
}

export async function getRondellisGourmet(): Promise<Rondelli[]> {
  const all = await getRondellis();
  return all.filter(r => r.is_gourmet);
}

export async function getRondelli(id: number): Promise<Rondelli> {
  return getProduct(id) as Promise<Rondelli>;
}

export async function createRondelli(data: any): Promise<Rondelli> {
  return createProduct(data) as Promise<Rondelli>;
}

export async function updateRondelli(id: number, data: any): Promise<Rondelli> {
  return updateProduct(id, data) as Promise<Rondelli>;
}

export async function deleteRondelli(id: number): Promise<void> {
  return deleteProduct(id);
}

// =============================================================================
// COMBOS
// =============================================================================

export async function getCombos(params: Record<string, any> = {}): Promise<Combo[]> {
  try {
    const response = await api.get(`${STORES_BASE}/combos/`, {
      params: { store: STORE_SLUG, ...params }
    });
    const results = response.data.results || response.data;
    return results.map(normalizeProduct);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/combos/`, error);
    throw error;
  }
}

export async function getCombo(id: number): Promise<Combo> {
  try {
    const response = await api.get(`${STORES_BASE}/combos/${id}/`);
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/combos/${id}/`, error);
    throw error;
  }
}

export async function createCombo(data: any): Promise<Combo> {
  try {
    const response = await api.post(`${STORES_BASE}/combos/`, {
      store: STORE_SLUG,
      ...data
    });
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/combos/`, error, data);
    throw error;
  }
}

export async function updateCombo(id: number, data: any): Promise<Combo> {
  try {
    const response = await api.patch(`${STORES_BASE}/combos/${id}/`, data);
    return normalizeProduct(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/combos/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCombo(id: number): Promise<void> {
  try {
    await api.delete(`${STORES_BASE}/combos/${id}/`);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/combos/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// ORDERS (Pedidos)
// =============================================================================

export async function getPedidos(params: Record<string, any> = {}): Promise<Pedido[]> {
  try {
    const response = await api.get(`${STORES_BASE}/orders/`, {
      params: { store: STORE_SLUG, ...params }
    });
    const results = response.data.results || response.data;
    return results.map(normalizeOrder);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/orders/`, error);
    throw error;
  }
}

export async function getPedido(id: string | number): Promise<Pedido> {
  try {
    const response = await api.get(`${STORES_BASE}/orders/${id}/`);
    return normalizeOrder(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/orders/${id}/`, error);
    throw error;
  }
}

export async function updatePedidoStatus(id: string | number, status: string): Promise<Pedido> {
  try {
    const response = await api.patch(`${STORES_BASE}/orders/${id}/`, { status });
    return normalizeOrder(response.data);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/orders/${id}/`, error);
    throw error;
  }
}

export async function getStatusPedido(id: string | number): Promise<{ status: string; payment_status: string }> {
  try {
    const response = await api.get(`${STORES_BASE}/orders/${id}/payment-status/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/orders/${id}/payment-status/`, error);
    throw error;
  }
}

// =============================================================================
// CATEGORIES
// =============================================================================

export async function getCategories(params: Record<string, any> = {}): Promise<Category[]> {
  try {
    const response = await api.get(`${STORES_BASE}/categories/`, {
      params: { store: STORE_SLUG, ...params }
    });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/categories/`, error);
    throw error;
  }
}

export async function getCategory(id: number): Promise<Category> {
  try {
    const response = await api.get(`${STORES_BASE}/categories/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/categories/${id}/`, error);
    throw error;
  }
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  try {
    const response = await api.post(`${STORES_BASE}/categories/`, {
      store: STORE_SLUG,
      ...data
    });
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/categories/`, error, data);
    throw error;
  }
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  try {
    const response = await api.patch(`${STORES_BASE}/categories/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/categories/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCategory(id: number): Promise<void> {
  try {
    await api.delete(`${STORES_BASE}/categories/${id}/`);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/categories/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get orders
    const ordersResponse = await api.get(`${STORES_BASE}/orders/`, {
      params: { store: STORE_SLUG }
    });
    const orders = ordersResponse.data.results || ordersResponse.data;
    
    // Get products
    const productsResponse = await api.get(`${STORES_BASE}/products/`, {
      params: { store: STORE_SLUG }
    });
    const products = productsResponse.data.results || productsResponse.data;
    
    // Calculate stats
    const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'confirmed');
    const totalRevenue = orders
      .filter((o: any) => o.payment_status === 'paid')
      .reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
    
    return {
      total_orders: orders.length,
      pending_orders: pendingOrders.length,
      total_revenue: totalRevenue,
      total_products: products.length,
    };
  } catch (error) {
    logger.apiError('dashboard stats', error);
    return {
      total_orders: 0,
      pending_orders: 0,
      total_revenue: 0,
      total_products: 0,
    };
  }
}

// =============================================================================
// CATALOG (Public)
// =============================================================================

export async function getCatalog(): Promise<any> {
  try {
    const response = await api.get(`${STORES_BASE}/s/${STORE_SLUG}/catalog/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/s/${STORE_SLUG}/catalog/`, error);
    throw error;
  }
}

// =============================================================================
// LEGACY ALIASES (for backward compatibility in components)
// =============================================================================

// Produtos
export const getProdutos = getProducts;
export const getProduto = getProduct;
export const createProduto = createProduct;
export const updateProduto = updateProduct;
export const deleteProduto = deleteProduct;

// Catalog alias
export const getCatalogo = getCatalog;

// Combos destaques
export async function getCombosDestaques(): Promise<Combo[]> {
  const combos = await getCombos();
  return combos.filter(c => c.destaque);
}

// Toggle functions (update is_active/is_featured)
export async function toggleProductActive(id: number): Promise<Produto> {
  const product = await getProduct(id);
  return updateProduct(id, { is_active: !product.is_active });
}

export async function toggleProductFeatured(id: number): Promise<Produto> {
  const product = await getProduct(id);
  return updateProduct(id, { is_featured: !product.is_featured });
}

export const toggleMolhoActive = toggleProductActive;
export const toggleCarneActive = toggleProductActive;
export const toggleRondelliActive = toggleProductActive;
export const toggleComboActive = toggleProductActive;
export const toggleComboDestaque = toggleProductFeatured;

// WhatsApp confirmation
export async function getWhatsAppConfirmacao(orderId: string | number): Promise<{ url: string }> {
  try {
    const response = await api.get(`${STORES_BASE}/orders/${orderId}/whatsapp/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${STORES_BASE}/orders/${orderId}/whatsapp/`, error);
    throw error;
  }
}

// Stats alias
export const getPastitaStats = getDashboardStats;

// Types re-export for compatibility
export type PastitaStats = DashboardStats;
export type Catalogo = any;
