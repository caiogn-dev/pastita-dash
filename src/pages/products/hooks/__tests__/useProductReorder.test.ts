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
});
