/**
 * Nenhum estado do pedido chega cru na tela.
 *
 * O modal exibia "Dinheiro cancelled" e "refunded" em inglês: os mapas de
 * rótulo tinham 11 dos 13 status e 5 dos 7 estados de pagamento. O fallback
 * `|| order.status` escondia a lacuna — nada quebrava, só aparecia em inglês
 * na tela que o dono mostra para o cliente ao telefone.
 *
 * Este teste é a catraca: status novo no backend sem rótulo aqui vira teste
 * vermelho em vez de palavra em inglês em produção.
 */
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../rotulosDePedido';

// Copiados de StoreOrder.OrderStatus / PaymentStatus (server2).
const STATUS_DO_BACKEND = [
  'pending', 'confirmed', 'processing', 'paid', 'preparing', 'ready',
  'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled',
  'refunded', 'failed',
];

const PAGAMENTO_DO_BACKEND = [
  'pending', 'processing', 'paid', 'failed', 'refunded',
  'partially_refunded', 'cancelled',
];

describe('rótulos de pedido', () => {
  it.each(STATUS_DO_BACKEND)('status %s tem rótulo em português', (s) => {
    expect(STATUS_LABELS[s]).toBeTruthy();
    expect(STATUS_LABELS[s]).not.toBe(s);
  });

  it.each(PAGAMENTO_DO_BACKEND)('pagamento %s tem rótulo em português', (s) => {
    expect(PAYMENT_STATUS_LABELS[s]).toBeTruthy();
    expect(PAYMENT_STATUS_LABELS[s]).not.toBe(s);
  });
});
