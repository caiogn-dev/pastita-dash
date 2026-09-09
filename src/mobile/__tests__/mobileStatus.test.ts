/**
 * O celular tem que seguir a MESMA máquina de estados do desktop.
 *
 * `mobileStatus` era uma terceira cópia da regra e olhava só o `status`,
 * ignorando o `delivery_method`. Como cada mudança de status dispara uma
 * mensagem no WhatsApp do cliente, o caminho errado não é cosmético:
 *
 *   entrega  → parava em `ready` e mandava "pronto para retirada"
 *   retirada → seguia para `out_for_delivery` e mandava "saiu para entrega"
 *
 * É o pedido CE-2608129257 (Diana, 12/ago) de novo, na cópia que sobrou.
 */
import { nextOrderStatus } from '../mobileStatus';

const pedido = (status: string, delivery_method: string) =>
  ({ status, delivery_method }) as never;

describe('entrega', () => {
  it('de preparando vai direto para saiu para entrega', () => {
    expect(nextOrderStatus(pedido('preparing', 'delivery'))?.status).toBe('out_for_delivery');
  });

  it('de saiu para entrega vai para entregue', () => {
    expect(nextOrderStatus(pedido('out_for_delivery', 'delivery'))?.status).toBe('delivered');
  });
});

describe('retirada', () => {
  it('de preparando vai para pronto', () => {
    expect(nextOrderStatus(pedido('preparing', 'pickup'))?.status).toBe('ready');
  });

  it('de pronto vai para entregue — nunca para saiu para entrega', () => {
    const proximo = nextOrderStatus(pedido('ready', 'pickup'));
    expect(proximo?.status).toBe('delivered');
    expect(proximo?.status).not.toBe('out_for_delivery');
  });
});

describe('link de pagamento (digital)', () => {
  it('não tem entregador: de preparando vai para pronto', () => {
    expect(nextOrderStatus(pedido('preparing', 'digital'))?.status).toBe('ready');
  });
});

describe('pontas', () => {
  it('confirma o pedido recebido', () => {
    expect(nextOrderStatus(pedido('pending', 'delivery'))?.status).toBe('confirmed');
  });

  it('entregue não tem próximo passo', () => {
    expect(nextOrderStatus(pedido('delivered', 'delivery'))).toBeNull();
  });

  it('cancelado não tem próximo passo', () => {
    expect(nextOrderStatus(pedido('cancelled', 'delivery'))).toBeNull();
  });

  it('o rótulo do botão vem junto e diz o passo', () => {
    expect(nextOrderStatus(pedido('preparing', 'delivery'))?.label).toMatch(/entrega/i);
    expect(nextOrderStatus(pedido('ready', 'pickup'))?.label).toMatch(/retirad/i);
  });
});
