/**
 * Pastita API Service
 * Handles all API calls to the Pastita backend endpoints for dashboard management
 */

import api from './api';
import logger from './logger';

const PASTITA_BASE = '/pastita';

// =============================================================================
// TYPES
// =============================================================================

export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  imagem: string | null;
  imagem_url: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Molho extends Produto {
  tipo_molho: string;
  quantidade_ml: number;
}

export interface Carne extends Produto {
  tipo_carne: string;
  peso_gramas: number;
}

export interface Rondelli extends Produto {
  recheio: string;
  tipo: 'classico' | 'gourmet';
  quantidade_unidades: number;
}

export interface Combo {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  preco_original: string | null;
  imagem: string | null;
  imagem_url: string;
  ativo: boolean;
  destaque: boolean;
  rondellis: Rondelli[];
  molhos: Molho[];
  carnes: Carne[];
  economia: string;
  percentual_desconto: number;
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
  nome_produto: string;
  quantidade: number;
  preco_unitario: string;
  subtotal: string;
}

export interface ItemComboPedido {
  id: number;
  nome_combo: string;
  quantidade: number;
  preco_unitario: string;
  subtotal: string;
}

export interface Pedido {
  id: number;
  numero: string;
  usuario: number;
  status: string;
  total: string;
  endereco_entrega: string;
  observacoes: string;
  preference_id: string | null;
  payment_id: string | null;
  criado_em: string;
  atualizado_em: string;
  itens: ItemPedido[];
  combos: ItemComboPedido[];
}

export interface Catalogo {
  rondellis_classicos: Rondelli[];
  rondellis_gourmet: Rondelli[];
  molhos: Molho[];
  carnes: Carne[];
  combos: Combo[];
  combos_destaque: Combo[];
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  ativo?: boolean;
}

export interface MolhoInput extends ProdutoInput {
  tipo_molho: string;
  quantidade_ml: number;
}

export interface CarneInput extends ProdutoInput {
  tipo_carne: string;
  peso_gramas: number;
}

export interface RondelliInput extends ProdutoInput {
  recheio: string;
  tipo: 'classico' | 'gourmet';
  quantidade_unidades: number;
}

export interface ComboInput {
  nome: string;
  descricao?: string;
  preco: number;
  preco_original?: number;
  ativo?: boolean;
  destaque?: boolean;
  rondellis?: number[];
  molhos?: number[];
  carnes?: number[];
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
    const response = await api.post(`${PASTITA_BASE}/molhos/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/molhos/`, error, data);
    throw error;
  }
}

export async function updateMolho(id: number, data: Partial<MolhoInput>): Promise<Molho> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/molhos/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/molhos/${id}/`, error, data);
    throw error;
  }
}

export async function deleteMolho(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/molhos/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/molhos/${id}/`, error);
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
    const response = await api.post(`${PASTITA_BASE}/carnes/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/carnes/`, error, data);
    throw error;
  }
}

export async function updateCarne(id: number, data: Partial<CarneInput>): Promise<Carne> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/carnes/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/carnes/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCarne(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/carnes/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/carnes/${id}/`, error);
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
    const response = await api.post(`${PASTITA_BASE}/rondellis/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/`, error, data);
    throw error;
  }
}

export async function updateRondelli(id: number, data: Partial<RondelliInput>): Promise<Rondelli> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/rondellis/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/${id}/`, error, data);
    throw error;
  }
}

export async function deleteRondelli(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/rondellis/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/rondellis/${id}/`, error);
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
    const response = await api.post(`${PASTITA_BASE}/combos/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/`, error, data);
    throw error;
  }
}

export async function updateCombo(id: number, data: Partial<ComboInput>): Promise<Combo> {
  try {
    const response = await api.patch(`${PASTITA_BASE}/combos/${id}/`, data);
    return response.data;
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/${id}/`, error, data);
    throw error;
  }
}

export async function deleteCombo(id: number): Promise<void> {
  try {
    await api.delete(`${PASTITA_BASE}/combos/${id}/`);
  } catch (error) {
    logger.apiError(`${PASTITA_BASE}/combos/${id}/`, error);
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
    const receitaTotal = pedidosPagos.reduce((acc, p) => acc + parseFloat(p.total), 0);

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

  // Pedidos
  getPedidos,
  getPedido,
  getStatusPedido,
  getWhatsAppConfirmacao,

  // Stats
  getPastitaStats,
};

export default pastitaApi;
