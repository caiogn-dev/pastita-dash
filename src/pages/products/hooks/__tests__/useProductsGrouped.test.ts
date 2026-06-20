import { describe, it, expect } from '@jest/globals';
import { groupProducts, CategoryGroup } from '../useProductsGrouped';

const cat = (id: string, name: string, sort_order: number, is_active = true) =>
  ({ id, name, sort_order, is_active }) as any;
const prod = (id: string, category: string | null, sort_order: number) =>
  ({ id, name: id, category, sort_order, status: 'active' }) as any;

describe('groupProducts', () => {
  it('agrupa por categoria e ordena por sort_order', () => {
    const cats = [cat('b', 'Bebidas', 2), cat('a', 'Almoço', 1)];
    const prods = [prod('p2', 'a', 2), prod('p1', 'a', 1), prod('p3', 'b', 1)];
    const groups = groupProducts(prods, cats);
    expect(groups.map(g => g.name)).toEqual(['Almoço', 'Bebidas']);
    expect(groups[0].products.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('joga produtos sem categoria para "Sem categoria" no fim', () => {
    const cats = [cat('a', 'Almoço', 1)];
    const prods = [prod('p1', 'a', 1), prod('px', null, 1)];
    const groups = groupProducts(prods, cats);
    expect(groups[groups.length - 1]).toMatchObject({ id: null, name: 'Sem categoria' });
    expect(groups[groups.length - 1].products.map(p => p.id)).toEqual(['px']);
  });

  it('inclui categoria vazia (sem produtos)', () => {
    const cats = [cat('a', 'Almoço', 1), cat('b', 'Bebidas', 2)];
    const groups = groupProducts([prod('p1', 'a', 1)], cats);
    expect(groups.find(g => g.id === 'b')?.products).toEqual([]);
  });
});
