jest.mock('../../../../services/storesApi', () => ({
  __esModule: true,
  updateProduct: jest.fn(),
  updateCategory: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react';
import { useProductReorder } from '../useProductReorder';
import * as storesApi from '../../../../services/storesApi';

describe('useProductReorder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reordena produtos na mesma categoria e persiste só os alterados', async () => {
    (storesApi.updateProduct as any).mockResolvedValue({});
    let products = [
      { id: 'p1', category: 'a', sort_order: 0 },
      { id: 'p2', category: 'a', sort_order: 1 },
    ] as any[];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const { result } = renderHook(() => useProductReorder({
      products, setProducts, categories: [{ id: 'a', sort_order: 0 } as any],
      setCategories: () => {}, onError: jest.fn(),
    }));
    await act(async () => {
      await result.current.onDragEnd({ active: { id: 'p1', data: { current: { type: 'product', category: 'a' } } }, over: { id: 'p2', data: { current: { type: 'product', category: 'a' } } } } as any);
    });
    expect(products.find((p) => p.id === 'p1').sort_order).toBe(1);
    expect(storesApi.updateProduct).toHaveBeenCalledWith('p1', { sort_order: 1 });
  });

  it('move produto entre categorias: reindexa origem E destino', async () => {
    (storesApi.updateProduct as any).mockResolvedValue({});
    let products = [
      { id: 'p1', category: 'a', sort_order: 0 },
      { id: 'p2', category: 'a', sort_order: 1 },
      { id: 'p3', category: 'b', sort_order: 0 },
    ] as any[];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const { result } = renderHook(() => useProductReorder({
      products, setProducts,
      categories: [{ id: 'a', sort_order: 0 } as any, { id: 'b', sort_order: 1 } as any],
      setCategories: () => {}, onError: jest.fn(),
    }));
    await act(async () => {
      await result.current.onDragEnd({
        active: { id: 'p1', data: { current: { type: 'product', category: 'a' } } },
        over: { id: 'p3', data: { current: { type: 'product', category: 'b' } } },
      } as any);
    });
    // moved foi pra categoria b no fim (sort_order 1, depois de p3)
    expect(products.find((p) => p.id === 'p1').category).toBe('b');
    expect(storesApi.updateProduct).toHaveBeenCalledWith('p1', { category: 'b', sort_order: 1 });
    // origem 'a' reindexada: p2 (era 1) vira 0 e é persistido
    expect(products.find((p) => p.id === 'p2').sort_order).toBe(0);
    expect(storesApi.updateProduct).toHaveBeenCalledWith('p2', { sort_order: 0 });
  });

  it('reordena categorias e persiste só as alteradas', async () => {
    (storesApi.updateCategory as any).mockResolvedValue({});
    let categories = [
      { id: 'a', sort_order: 0 },
      { id: 'b', sort_order: 1 },
    ] as any[];
    const setCategories = (fn: any) => { categories = typeof fn === 'function' ? fn(categories) : fn; };
    const { result } = renderHook(() => useProductReorder({
      products: [], setProducts: () => {}, categories, setCategories, onError: jest.fn(),
    }));
    await act(async () => {
      await result.current.onDragEnd({
        active: { id: 'a', data: { current: { type: 'category', category: 'a' } } },
        over: { id: 'b', data: { current: { type: 'category', category: 'b' } } },
      } as any);
    });
    expect(categories.find((c) => c.id === 'a').sort_order).toBe(1);
    expect(categories.find((c) => c.id === 'b').sort_order).toBe(0);
    expect(storesApi.updateCategory).toHaveBeenCalled();
  });

  it('ignora drop de categoria sobre alvo inválido (over não é categoria)', async () => {
    const categories = [{ id: 'a', sort_order: 0 }, { id: 'b', sort_order: 1 }] as any[];
    const setCategories = jest.fn();
    const { result } = renderHook(() => useProductReorder({
      products: [], setProducts: () => {}, categories, setCategories, onError: jest.fn(),
    }));
    await act(async () => {
      await result.current.onDragEnd({
        active: { id: 'a', data: { current: { type: 'category', category: 'a' } } },
        over: { id: 'p99', data: { current: { type: 'product', category: 'b' } } },
      } as any);
    });
    expect(setCategories).not.toHaveBeenCalled();
    expect(storesApi.updateCategory).not.toHaveBeenCalled();
  });
});
