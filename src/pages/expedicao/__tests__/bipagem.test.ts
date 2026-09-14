import { acaoDaBipagem, codigoBipado, ehBipagemRepetida, pedidoDoCodigo } from '../bipagem';
import type { Order } from '../../../types';

const pedido = (extra: Partial<Order>): Order =>
  ({ id: '1', order_number: 'CE-2608211372', status: 'preparing', delivery_method: 'delivery', ...extra }) as Order;

describe('codigoBipado', () => {
  it('limpa espaço e caixa do leitor', () => {
    expect(codigoBipado('  ce-2608211372\n')).toBe('CE-2608211372');
  });

  it('o seletor {B do Code128 não entra no código', () => {
    expect(codigoBipado('{BCE-2608211372')).toBe('CE-2608211372');
  });
});

describe('pedidoDoCodigo', () => {
  it('casa pelo número exato, nunca por "contém"', () => {
    const lista = [pedido({ id: 'a', order_number: 'CE-26082113720' }), pedido({ id: 'b' })];
    expect(pedidoDoCodigo(lista, 'CE-2608211372')?.id).toBe('b');
  });

  it('sem pedido exato devolve null', () => {
    expect(pedidoDoCodigo([pedido({ order_number: 'CE-26082113720' })], 'CE-2608211372')).toBeNull();
  });
});

describe('acaoDaBipagem — usa a máquina de estados única (proximaAcao)', () => {
  it('entrega em preparo: saiu para entrega', () => {
    const r = acaoDaBipagem(pedido({ status: 'preparing', delivery_method: 'delivery' }));
    expect(r).toMatchObject({ tipo: 'avancar', status: 'out_for_delivery' });
  });

  it('retirada em preparo: pronto para retirada (nunca "saiu para entrega")', () => {
    const r = acaoDaBipagem(pedido({ status: 'preparing', delivery_method: 'pickup' }));
    expect(r).toMatchObject({ tipo: 'avancar', status: 'ready' });
  });

  it('entrega que saiu: entregue', () => {
    expect(acaoDaBipagem(pedido({ status: 'out_for_delivery' }))).toMatchObject({ tipo: 'avancar', status: 'delivered' });
  });

  it('retirada pronta: retirado', () => {
    expect(acaoDaBipagem(pedido({ status: 'ready', delivery_method: 'pickup' }))).toMatchObject({ tipo: 'avancar', status: 'delivered' });
  });

  it('pedido que nem entrou em preparo não sai pela expedição', () => {
    const r = acaoDaBipagem(pedido({ status: 'pending' }));
    expect(r.tipo).toBe('recusa');
    expect(acaoDaBipagem(pedido({ status: 'confirmed' })).tipo).toBe('recusa');
  });

  it('pedido entregue ou cancelado: recusa com motivo', () => {
    const entregue = acaoDaBipagem(pedido({ status: 'delivered' }));
    expect(entregue.tipo).toBe('recusa');
    if (entregue.tipo === 'recusa') expect(entregue.motivo).toMatch(/entregue/i);
    expect(acaoDaBipagem(pedido({ status: 'cancelled' })).tipo).toBe('recusa');
  });
});

describe('ehBipagemRepetida', () => {
  it('o mesmo código em menos de 3s é o leitor lendo duas vezes', () => {
    expect(ehBipagemRepetida({ codigo: 'CE-1', em: 1000 }, 'CE-1', 3500)).toBe(true);
  });

  it('código diferente ou depois de 3s é bipagem nova', () => {
    expect(ehBipagemRepetida({ codigo: 'CE-1', em: 1000 }, 'CE-2', 1500)).toBe(false);
    expect(ehBipagemRepetida({ codigo: 'CE-1', em: 1000 }, 'CE-1', 4500)).toBe(false);
    expect(ehBipagemRepetida(null, 'CE-1', 1000)).toBe(false);
  });
});
