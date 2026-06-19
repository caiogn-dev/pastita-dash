// src/components/orders/newOrder/types.ts
import type { Product } from '../../../services/products';
import type { CustomerSearchResult } from '../../../types/crm';

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'fiado';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão',
  fiado: 'Fiado',
};

export const STEP_LABELS = ['Cliente', 'Entrega', 'Itens', 'Ajustes', 'Confirmar'];

export interface Customer extends CustomerSearchResult {
  phone_number_edited?: string;
}

export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
