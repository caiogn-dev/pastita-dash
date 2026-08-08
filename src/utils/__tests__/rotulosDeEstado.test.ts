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
import {
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  PRINT_JOB_STATUS_LABELS,
  ACCOUNT_STATUS_LABELS,
  EMAIL_RECIPIENT_STATUS_LABELS,
} from '../rotulosDeEstado';

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

// Cada vocabulário do backend que chega a uma tela. A lista é copiada dos
// TextChoices do server2 — quando um estado novo nasce lá e ninguém traduz
// aqui, este teste fica vermelho em vez de a palavra aparecer em inglês para
// o dono da loja.
describe('vocabulários dos outros domínios', () => {
  const casos: [string, Record<string, string>, string[]][] = [
    ['cobrança', PAYMENT_RECORD_STATUS_LABELS,
      ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded']],
    ['impressão', PRINT_JOB_STATUS_LABELS,
      ['pending', 'claimed', 'completed', 'failed', 'cancelled']],
    ['conta WhatsApp', ACCOUNT_STATUS_LABELS,
      ['active', 'inactive', 'suspended', 'pending']],
    ['e-mail', EMAIL_RECIPIENT_STATUS_LABELS,
      ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed']],
  ];

  it.each(casos)('%s: todos os estados têm rótulo', (_nome, mapa, estados) => {
    for (const e of estados) {
      expect(mapa[e]).toBeTruthy();
      expect(mapa[e]).not.toBe(e);
    }
  });

  it('cobrança e pedido não compartilham vocabulário', () => {
    // O pedido fica `paid`, a cobrança fica `completed`. Reusar o mapa do
    // pedido foi exatamente o que fez a tela mostrar "completed" cru.
    expect(PAYMENT_RECORD_STATUS_LABELS.completed).toBeTruthy();
    expect(PAYMENT_STATUS_LABELS.completed).toBeUndefined();
  });
});
