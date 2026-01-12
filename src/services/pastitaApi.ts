/**
 * Pastita API Service
 * Handles all API calls to the Pastita backend endpoints for dashboard management
 * 
 * UPDATED: Now uses the unified stores API instead of legacy /pastita/ endpoints
 * All products are managed through /stores/products/ with store filter
 */

import api from './api';
import logger from './logger';

// Store slug for Pastita - can be configured via environment
const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

// Base URLs for the unified API
const STORES_BASE = '/stores';
const STORE_PRODUCTS_URL = `${STORES_BASE}/products`;
const STORE_CATEGORIES_URL = `${STORES_BASE}/categories`;
const STORE_COMBOS_URL = `${STORES_BASE}/combos`;
const STORE_ORDERS_URL = `${STORES_BASE}/orders`;

// Legacy Pastita API base (for backward compatibility during migration)
const PASTITA_BASE = '/pastita';

// Helper to get store ID (cached)
let cachedStoreId: string | null = null;

async function getStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  
  try {
    const response = await api.get(`${STORES_BASE}/stores/`, { params: { slug: STORE_SLUG } });
    const stores = response.data.results || response.data;
    if (stores.length > 0) {
      cachedStoreId = stores[0].id as string;
      return cachedStoreId;
    }
    throw new Error(`Store with slug '${STORE_SLUG}' not found`);
  } catch (error) {
    logger.apiError(`${STORES_BASE}/stores/`, error);
    throw error;
  }
}

// Clear cached store ID (useful for testing)
export function clearStoreCache(): void {
  cachedStoreId = null;
}

// =============================================================================
// TYPES - Matching Django serializers exactly
// =============================================================================

export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: string | number;  // API returns string, but we handle both
  imagem: string | null;
  imagem_url: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em?: string;
  estoque?: number;
  tipo_produto?: 'molho' | 'carne' | 'rondelli' | 'produto';
}

export interface Molho extends Produto {
  tipo: string;  // 'tradicional', 'especial', 'gourmet'
  tipo_display: string;
  quantidade: string | number;  // ml - API returns string
}

export interface Carne extends Produto {
  tipo: string;  // 'bovina', 'suina', 'frango', 'peixe'
  tipo_display: string;
  quantidade: string | number;  // grams - API returns string
  molhos: number[];  // IDs of compatible sauces
  molhos_compativeis: Molho[];
}

export interface Rondelli extends Produto {
  categoria: string;  // 'classico', 'gourmet', 'especial'
  categoria_display: string;
  sabor: string;
  sabor_display: string;
  quantidade: string | number;  // grams - API returns string
  is_gourmet: boolean;
}

export interface Combo {
  id: number;
  nome: string;
  descricao: string;
  preco: string | number;  // API returns string
  preco_original: string | number | null;
  imagem: string | null;
  imagem_url: string | null;
  ativo: boolean;
  destaque: boolean;
  estoque?: number;
  quantidade_pessoas?: number;
  molhos: number[];  // IDs
  molhos_inclusos: Molho[];
  carne: number | null;  // ID
  carne_inclusa: Carne | null;
  rondelli: number | null;  // ID
  rondelli_incluso: Rondelli | null;
  economia: string | number;
  percentual_desconto: number;
  criado_em: string;
}

export interface ItemCarrinho {
  id: number;
  produto: Produto;
  quantidade: number;
  subtotal: string;
}

export interface ItemComboCarrinho {
  id: number;
  combo: Combo;
  quantidade: number;
  subtotal: string;
}

export interface Carrinho {
  id: number;
  itens: ItemCarrinho[];
  combos: ItemComboCarrinho[];
  total_produtos: string;
  total_combos: string;
  total: string;
}

export interface ItemPedido {
  id: number;
  produto: number;
  produto_info?: Produto;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface ItemComboPedido {
  id: number;
  combo: number;
  combo_info?: Combo;
  nome_combo: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface EnderecoEntrega {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude?: number;
  longitude?: number;
}

export interface Pedido {
  id: number;
  usuario: number;
  status: string;
  status_display?: string;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  cupom_codigo?: string | null;
  total: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email?: string;
  endereco_entrega: EnderecoEntrega | null;
  observacoes: string;
  preference_id: string | null;
  payment_id: string | null;
  criado_em: string;
  atualizado_em: string;
  itens: ItemPedido[];
  itens_combo: ItemComboPedido[];
}

export interface Catalogo {
  massas_classicos: Rondelli[];  // Matches Django CatalogoView response
  massas_gourmet: Rondelli[];
  molhos: Molho[];
  carnes: Carne[];
  combos: Combo[];
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number | string;
  ativo?: boolean;
  imagem?: File | null;
}

export interface MolhoInput {
  nome: string;
  tipo: string;  // 'tradicional', 'especial', 'gourmet'
  descricao?: string;
  quantidade: number;  // ml
  preco: number;
  ativo?: boolean;
  imagem?: File | null;
}

export interface CarneInput {
  nome: string;
  tipo: string;  // 'bovina', 'suina', 'frango', 'peixe'
  descricao?: string;
  quantidade: number;  // grams
  preco: number;
  molhos_compativeis: number[];  // IDs of compatible sauces
  ativo?: boolean;
  imagem?: File | null;
}

export interface RondelliInput {
  nome: string;
  sabor: string;
  categoria: string;  // 'classico', 'gourmet', 'especial'
  descricao?: string;
  preco: number;
  is_gourmet?: boolean;
  ativo?: boolean;
  imagem?: File | null;
}

export interface ComboInput {
  nome: string;
  descricao?: string;
  preco: number;
  preco_original?: number;
  quantidade_pessoas?: number;
  ativo?: boolean;
  destaque?: boolean;
  molhos_inclusos: number[];  // IDs
  carne_inclusa?: number | null;  // ID
  rondelli_incluso?: number | null;  // ID
  imagem?: File | null;
}

// =============================================================================
// CATALOG / PRODUCTS
// =============================================================================

/**
 * Get full catalog (all products organized by category)
 */
export async function getCatalogo(): Promise<Catalogo> {
  try {
    const response = await api.get(`${PASTITA_BASE}/catalogo/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/catalogo/`, error);
    throw error;
  }
}

/**
 * Get all products
 */
export async function getProdutos(params: Record<string, string> = {}): Promise<Produto[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/produtos/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/produtos/`, error);
    throw error;
  }
}

/**
 * Get single product by ID
 */
export async function getProduto(id: number): Promise<Produto> {
  try {
    const response = await api.get(`${PASTITA_BASE}/produtos/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/produtos/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// MOLHOS (Sauces)
// =============================================================================

export async function getMolhos(params: Record<string, string> = {}): Promise<Molho[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/molhos/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/molhos/`, error);
    throw error;
  }
}

export async function getMolho(id: number): Promise<Molho> {
  try {
    const response = await api.get(`${PASTITA_BASE}/molhos/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/molhos/${id}/`, error);
    throw error;
  }
}

export async function createMolho(data: MolhoInput): Promise<Molho> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/molhos/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/molhos/`, error, data);
    throw error;
  }
}

export async function updateMolho(id: number, data: Partial<MolhoInput>): Promise<Molho> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/admin/molhos/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/molhos/${id}/`, error, data);
    throw error;
  }
}

export async function deleteMolho(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/admin/molhos/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/molhos/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// CARNES (Meats)
// =============================================================================

export async function getCarnes(params: Record<string, string> = {}): Promise<Carne[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/carnes/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/carnes/`, error);
    throw error;
  }
}

export async function getCarne(id: number): Promise<Carne> {
  try {
    const response = await api.get(`${PASTITA_BASE}/carnes/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/carnes/${id}/`, error);
    throw error;
  }
}

export async function createCarne(data: CarneInput): Promise<Carne> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/carnes/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/carnes/`, error, data);
    throw error;
  }
}

export async function updateCarne(id: number, data: Partial<CarneInput>): Promise<Carne> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/admin/carnes/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/carnes/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCarne(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/admin/carnes/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/carnes/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// RONDELLIS (Pastas)
// =============================================================================

export async function getRondellis(params: Record<string, string> = {}): Promise<Rondelli[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/rondellis/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/`, error);
    throw error;
  }
}

export async function getRondellisClassicos(): Promise<Rondelli[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/rondellis/classicos/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/classicos/`, error);
    throw error;
  }
}

export async function getRondellisGourmet(): Promise<Rondelli[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/rondellis/gourmet/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/gourmet/`, error);
    throw error;
  }
}

export async function getRondelli(id: number): Promise<Rondelli> {
  try {
    const response = await api.get(`${PASTITA_BASE}/rondellis/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/${id}/`, error);
    throw error;
  }
}

export async function createRondelli(data: RondelliInput): Promise<Rondelli> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/rondellis/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/rondellis/`, error, data);
    throw error;
  }
}

export async function updateRondelli(id: number, data: Partial<RondelliInput>): Promise<Rondelli> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/admin/rondellis/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/rondellis/${id}/`, error, data);
    throw error;
  }
}

export async function deleteRondelli(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/admin/rondellis/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/rondellis/${id}/`, error);
    throw error;
  }
}

// =============================================================================
// COMBOS
// =============================================================================

export async function getCombos(params: Record<string, string> = {}): Promise<Combo[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/combos/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/`, error);
    throw error;
  }
}

export async function getCombosDestaques(): Promise<Combo[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/combos/destaques/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/destaques/`, error);
    throw error;
  }
}

export async function getCombo(id: number): Promise<Combo> {
  try {
    const response = await api.get(`${PASTITA_BASE}/combos/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/${id}/`, error);
    throw error;
  }
}

export async function createCombo(data: ComboInput): Promise<Combo> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/combos/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/combos/`, error, data);
    throw error;
  }
}

export async function updateCombo(id: number, data: Partial<ComboInput>): Promise<Combo> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/admin/combos/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/combos/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCombo(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/admin/combos/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/combos/${id}/`, error);
    throw error;
  }
}

export async function toggleComboActive(id: number): Promise<{ id: number; ativo: boolean; message: string }> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/combos/${id}/toggle_active/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/combos/${id}/toggle_active/`, error);
    throw error;
  }
}

export async function toggleComboDestaque(id: number): Promise<{ id: number; destaque: boolean; message: string }> {
  try {
    const response = await api.post(`${PASTITA_BASE}/admin/combos/${id}/toggle_destaque/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/admin/combos/${id}/toggle_destaque/`, error);
    throw error;
  }
}

// =============================================================================
// PEDIDOS (Orders)
// =============================================================================

export async function getPedidos(params: Record<string, string> = {}): Promise<Pedido[]> {
  try {
    const response = await api.get(`${PASTITA_BASE}/pedidos/`, { params });
    return response.data.results || response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/pedidos/`, error);
    throw error;
  }
}

export async function getPedido(id: number): Promise<Pedido> {
  try {
    const response = await api.get(`${PASTITA_BASE}/pedidos/${id}/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/pedidos/${id}/`, error);
    throw error;
  }
}

export async function getStatusPedido(id: number): Promise<{ status: string; payment_status: string }> {
  try {
    const response = await api.get(`${PASTITA_BASE}/pedidos/${id}/status/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/pedidos/${id}/status/`, error);
    throw error;
  }
}

export async function updatePedidoStatus(id: number, status: string): Promise<Pedido> {
  try {
    const response = await api.post(`${PASTITA_BASE}/pedidos/${id}/update_status/`, { status });
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/pedidos/${id}/update_status/`, error);
    throw error;
  }
}

export async function getWhatsAppConfirmacao(id: number): Promise<{ whatsapp_url: string }> {
  try {
    const response = await api.get(`${PASTITA_BASE}/pedidos/${id}/whatsapp/`);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/pedidos/${id}/whatsapp/`, error);
    throw error;
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface PastitaStats {
  total_produtos: number;
  total_molhos: number;
  total_carnes: number;
  total_rondellis: number;
  total_combos: number;
  total_pedidos: number;
  pedidos_pendentes: number;
  pedidos_pagos: number;
  receita_total: string;
}

export async function getPastitaStats(): Promise<PastitaStats> {
  try {
    // This endpoint would need to be created on the backend
    const [produtos, molhos, carnes, rondellis, combos, pedidos] = await Promise.all([
      getProdutos(),
      getMolhos(),
      getCarnes(),
      getRondellis(),
      getCombos(),
      getPedidos(),
    ]);

    const pedidosPagos = pedidos.filter(p => p.status === 'pago' || p.status === 'entregue');
    const receitaTotal = pedidosPagos.reduce((acc, p) => acc + p.total, 0);

    return {
      total_produtos: produtos.length,
      total_molhos: molhos.length,
      total_carnes: carnes.length,
      total_rondellis: rondellis.length,
      total_combos: combos.length,
      total_pedidos: pedidos.length,
      pedidos_pendentes: pedidos.filter(p => p.status === 'pendente').length,
      pedidos_pagos: pedidosPagos.length,
      receita_total: receitaTotal.toFixed(2),
    };
  } catch (error) {
    logger.apiError('pastita/stats', error);
    throw error;
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const pastitaApi = {
  // Catalog
  getCatalogo,
  getProdutos,
  getProduto,

  // Molhos
  getMolhos,
  getMolho,
  createMolho,
  updateMolho,
  deleteMolho,

  // Carnes
  getCarnes,
  getCarne,
  createCarne,
  updateCarne,
  deleteCarne,

  // Rondellis
  getRondellis,
  getRondellisClassicos,
  getRondellisGourmet,
  getRondelli,
  createRondelli,
  updateRondelli,
  deleteRondelli,

  // Combos
  getCombos,
  getCombosDestaques,
  getCombo,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleComboActive,
  toggleComboDestaque,

  // Pedidos
  getPedidos,
  getPedido,
  getStatusPedido,
  updatePedidoStatus,
  getWhatsAppConfirmacao,

  // Stats
  getPastitaStats,
};

export default pastitaApi;
