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
 * mãos na entrega/retirada (dinheiro, maquininha ou vale na maquininha), ou
 * fica a receber (fiado). O antigo botão "Cartão" mandava `credit_card` — o
 * caixa lia crédito recebido num pedido que ainda ia ser pago na maquininha.
 * 28/10: `fiado` deixou de ir como `cash` + nota (contava como recebido no
 * caixa ao entregar) e o vale ganhou forma própria.
 */
export type PaymentMethod = 'pix' | 'cash' | 'card_on_delivery' | 'voucher_on_delivery' | 'fiado';

/** Ordem das chaves = ordem dos botões. Nomes reais vêm do mapa único. */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: rotuloDePagamento('pix'),
  cash: rotuloDePagamento('cash'),
  card_on_delivery: rotuloDePagamento('card_on_delivery'),
  voucher_on_delivery: rotuloDePagamento('voucher_on_delivery'),
  fiado: 'Fiado',
};

/**
 * Bandeiras de vale aceitas na maquininha. Espelha o catálogo do server2
 * (`services/voucher/bandeiras.py`); o valor gravado é o mesmo de lá.
 */
export const BANDEIRAS_DE_VALE = [
  { valor: 'vr', rotulo: 'VR' },
  { valor: 'sodexo', rotulo: 'Pluxee' },
  { valor: 'ticket', rotulo: 'Ticket' },
  { valor: 'alelo', rotulo: 'Alelo' },
] as const;

/** Cupom já conferido no servidor: o desconto mostrado é o que vai ser dado. */
export interface CupomValidado {
  codigo: string;
  desconto: number;
}

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
