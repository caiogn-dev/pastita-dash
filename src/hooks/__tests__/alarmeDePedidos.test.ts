// O sino do balcão toca até alguém aceitar o pedido (28/10). Antes eram 30 s
// de arpejo e silêncio: pedido entrado com a cozinha barulhenta ficava parado
// em "Recebido". A regra de quando parar mora aqui, sem áudio, para testar.
import { precisaDeAceite, aindaAguardando } from '../alarmeDePedidos';

const pedido = (o: Record<string, unknown>) => ({ id: 'p1', status: 'pending', payment_method: 'cash', payment_status: 'pending', ...o });

describe('precisaDeAceite', () => {
  it('pedido recebido e não aceito precisa', () => {
    expect(precisaDeAceite(pedido({}))).toBe(true);
    expect(precisaDeAceite(pedido({ status: 'processing' }))).toBe(true);
  });

  it('aceito, em preparo ou cancelado não precisa', () => {
    for (const status of ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']) {
      expect(precisaDeAceite(pedido({ status }))).toBe(false);
    }
  });

  it('PIX ainda não pago não toca — o cliente nem pagou', () => {
    expect(precisaDeAceite(pedido({ payment_method: 'pix', payment_status: 'pending' }))).toBe(false);
    expect(precisaDeAceite(pedido({ payment_method: 'pix', payment_status: 'paid' }))).toBe(true);
  });
});

describe('aindaAguardando', () => {
  it('tira da lista o pedido que foi aceito', () => {
    const ids = new Set(['p1', 'p2']);
    const pedidos = [pedido({ id: 'p1', status: 'confirmed' }), pedido({ id: 'p2' })];
    expect([...aindaAguardando(ids, pedidos)]).toEqual(['p2']);
  });

  it('pedido que ainda não chegou na lista continua aguardando', () => {
    expect([...aindaAguardando(new Set(['novo']), [])]).toEqual(['novo']);
  });
});
