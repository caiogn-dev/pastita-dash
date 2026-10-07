// Relatórios usam o mesmo nome de forma de pagamento do resto do painel.
import { paymentLabel, gatewayLabel } from '../shared';
import { rotuloDePagamento } from '../../../../utils/rotulosDeEstado';

describe('paymentLabel nos relatórios', () => {
  it.each(['pix', 'cash', 'card', 'credit_card', 'debit_card', 'card_on_delivery', 'voucher', 'voucher_link', 'link'])(
    '%s usa o mapa único',
    (m) => {
      expect(paymentLabel(m)).toBe(rotuloDePagamento(m));
      expect(paymentLabel(m)).not.toBe(m);
    },
  );

  it('"nao_informado" do agrupamento vira texto', () => {
    expect(paymentLabel('nao_informado')).toBe('Não informado');
  });
});

describe('gatewayLabel', () => {
  it('nomeia o gateway, que não é forma de pagamento', () => {
    expect(gatewayLabel('mercadopago')).toBe('Mercado Pago');
  });
});
