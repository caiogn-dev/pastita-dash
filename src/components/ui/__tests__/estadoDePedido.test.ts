/**
 * Status do pedido → rótulo e tom, num mapa só.
 *
 * O quadro de pedidos pintava cada coluna com uma paleta crua (slate, blue,
 * orange, indigo, emerald) escrita em orderColumns.ts, e o botão de avançar
 * repetia outra paleta em proximaAcao.ts. A cor do status do pedido agora vem
 * daqui — a mesma regra do resto do painel: cor só em estado, tom semântico.
 */
import { describe, expect, it } from '@jest/globals';

import { estadoDePedido, tomDoPrazo } from '../estados';
import { COLUMNS } from '../../../pages/orders/orderColumns';

describe('estadoDePedido', () => {
  it('cada etapa do quadro tem um tom próprio', () => {
    expect(estadoDePedido('pending')).toEqual({ rotulo: 'Pendente', tone: 'warning' });
    expect(estadoDePedido('confirmed')).toEqual({ rotulo: 'Confirmado', tone: 'info' });
    expect(estadoDePedido('preparing')).toEqual({ rotulo: 'Preparando', tone: 'brand' });
    expect(estadoDePedido('out_for_delivery')).toEqual({ rotulo: 'Saiu para entrega', tone: 'success' });
    expect(estadoDePedido('delivered')).toEqual({ rotulo: 'Entregue', tone: 'neutral' });
  });

  it('sinônimos do backend caem no mesmo tom da etapa', () => {
    for (const s of ['processing', 'awaiting_payment', 'payment_pending']) {
      expect(estadoDePedido(s).tone).toBe('warning');
    }
    for (const s of ['paid', 'payment_confirmed']) expect(estadoDePedido(s).tone).toBe('info');
    for (const s of ['ready', 'shipped']) expect(estadoDePedido(s).tone).toBe('success');
    expect(estadoDePedido('completed').tone).toBe('neutral');
  });

  it('falho é perigo; cancelado e estornado são neutros (fim, não falha)', () => {
    expect(estadoDePedido('cancelled')).toEqual({ rotulo: 'Cancelado', tone: 'neutral' });
    expect(estadoDePedido('failed').tone).toBe('danger');
    expect(estadoDePedido('refunded').tone).toBe('neutral');
  });

  it('ignora caixa e não quebra com vazio ou desconhecido', () => {
    expect(estadoDePedido('OUT_FOR_DELIVERY').tone).toBe('success');
    expect(estadoDePedido('xyz')).toEqual({ rotulo: 'xyz', tone: 'neutral' });
    expect(estadoDePedido(null)).toEqual({ rotulo: '—', tone: 'neutral' });
    expect(estadoDePedido(undefined).tone).toBe('neutral');
  });

  it('rótulos em frase, nunca em caixa alta', () => {
    const todos = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'];
    for (const s of todos) {
      const { rotulo } = estadoDePedido(s);
      expect(rotulo[0]).toBe(rotulo[0].toUpperCase());
      expect(rotulo.slice(1)).toBe(rotulo.slice(1).toLowerCase());
    }
  });

  it('todos os status de uma coluna do quadro compartilham o mesmo tom', () => {
    for (const col of COLUMNS) {
      const tons = new Set(col.statuses.map((s) => estadoDePedido(s).tone));
      expect([col.id, tons.size]).toEqual([col.id, 1]);
    }
  });

  it('as cinco colunas do quadro têm cinco tons diferentes', () => {
    const tons = COLUMNS.map((col) => estadoDePedido(col.statuses[0]).tone);
    expect(new Set(tons).size).toBe(COLUMNS.length);
  });
});

describe('tomDoPrazo', () => {
  it('no prazo é neutro, perto do limite é atenção, estourado é perigo', () => {
    expect(tomDoPrazo('ok')).toBe('neutral');
    expect(tomDoPrazo('warning')).toBe('warning');
    expect(tomDoPrazo('critical')).toBe('danger');
  });
});
