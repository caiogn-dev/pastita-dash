import { seloDa99 } from '../pedidoDa99';

describe('seloDa99', () => {
  it('pedido da 99 mostra o número que o entregador e o app da 99 usam', () => {
    expect(seloDa99({ source: '99food', metadata: { '99food': { numero: 7 } } })).toBe('99 #7');
  });

  it('sem número ainda diz que é da 99', () => {
    expect(seloDa99({ source: '99food', metadata: {} })).toBe('99Food');
  });

  it('pedido de outro canal não tem selo', () => {
    expect(seloDa99({ source: 'web', metadata: { '99food': { numero: 7 } } })).toBeNull();
    expect(seloDa99({})).toBeNull();
  });
});
