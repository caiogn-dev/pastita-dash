import { saldoDoPedido, podeRegistrarPagamento, FORMAS_DE_REGISTRO } from '../saldoDoPedido';

const normaliza = (s: string) => s.replace(/\s/g, ' ');

describe('saldoDoPedido', () => {
  it('pago a menor diz quanto entrou, de quanto, e quanto falta', () => {
    const s = saldoDoPedido({ status: 'pending', total: 43.28, amount_paid: 38.95, amount_due: 4.33 });
    expect(s.aMenor).toBe(true);
    expect(normaliza(s.texto)).toBe('Pago R$ 38,95 de R$ 43,28 — falta R$ 4,33');
  });

  it('nada pago não é "a menor" — é só falta receber', () => {
    const s = saldoDoPedido({ status: 'pending', total: 50, amount_paid: 0, amount_due: 50 });
    expect(s.aMenor).toBe(false);
    expect(s.texto).toBe('');
  });

  it('quitado não é a menor', () => {
    expect(saldoDoPedido({ total: 50, amount_paid: 50, amount_due: 0 }).aMenor).toBe(false);
  });

  it('cancelado com dinheiro dentro não pede cobrança', () => {
    const pedido = { status: 'cancelled', total: 46.01, amount_paid: 40.76, amount_due: 5.25 };
    expect(saldoDoPedido(pedido).aMenor).toBe(false);
    expect(podeRegistrarPagamento(pedido)).toBe(false);
  });

  it('aceita string decimal do backend', () => {
    const s = saldoDoPedido({ total: '100.00', amount_paid: '30.00', amount_due: '70.00' });
    expect(s.falta).toBe(70);
    expect(s.aMenor).toBe(true);
  });
});

describe('podeRegistrarPagamento', () => {
  it('só com saldo', () => {
    expect(podeRegistrarPagamento({ status: 'delivered', amount_due: 20 })).toBe(true);
    expect(podeRegistrarPagamento({ status: 'delivered', amount_due: 0 })).toBe(false);
    expect(podeRegistrarPagamento({ status: 'delivered' })).toBe(false);
  });
});

describe('FORMAS_DE_REGISTRO', () => {
  it('só slugs canônicos (sem os dialetos card/link/rótulo)', () => {
    const valores = FORMAS_DE_REGISTRO.map((f) => f.valor);
    expect(valores).toEqual(['cash', 'debit_card', 'credit_card', 'pix', 'voucher', 'other']);
  });
});
