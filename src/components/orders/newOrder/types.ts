// src/components/orders/newOrder/types.ts
import type { Product } from '../../../services/products';
import type { CustomerSearchResult } from '../../../types/crm';
import { rotuloDePagamento } from '../../../utils/rotulosDeEstado';

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

/**
 * Pedido lançado pelo atendente: ou sai cobrança PIX, ou o cliente paga em
 * mãos na entrega/retirada (dinheiro ou maquininha). O antigo botão "Cartão"
 * mandava `credit_card` — o caixa lia crédito recebido num pedido que ainda
 * ia ser pago na maquininha. `fiado` é só do painel: vai como `cash` + nota.
 */
export type PaymentMethod = 'pix' | 'cash' | 'card_on_delivery' | 'fiado';

/** Ordem das chaves = ordem dos botões. Nomes reais vêm do mapa único. */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: rotuloDePagamento('pix'),
  cash: rotuloDePagamento('cash'),
  card_on_delivery: rotuloDePagamento('card_on_delivery'),
  fiado: 'Fiado',
};

/**
 * Desconto e acréscimo eram um passo inteiro que quase todo pedido pulava:
 * um "Próximo" a mais por pedido. Hoje moram recolhidos na confirmação.
 */
export const STEP_LABELS = ['Cliente', 'Entrega', 'Itens', 'Confirmar'];
export const ULTIMO_PASSO = STEP_LABELS.length - 1;

export interface Customer extends CustomerSearchResult {
  phone_number_edited?: string;
}

/** Mantido como reexport: meia dúzia de arquivos do PDV importam `fmt` daqui. */
export { formatCurrency as fmt } from '../../../utils/formatters';
