import { renderHook, act } from '@testing-library/react';

// Mock modules first (hoisted)
jest.mock('../../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../../services/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../../services/storesApi', () => ({
  __esModule: true,
  updateProduct: jest.fn(),
  updateProductStock: jest.fn(),
}));

import { useInlineProductMutations } from '../useInlineProductMutations';
import * as storesApi from '../../../../services/storesApi';

describe('useInlineProductMutations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('setPrice aplica optimistic e persiste', async () => {
    (storesApi.updateProduct as any).mockResolvedValue({});
    let products = [{ id: 'p1', price: 10 } as any];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const onError = jest.fn();
    const { result } = renderHook(() => useInlineProductMutations({ products, setProducts, onError }));
    await act(async () => { await result.current.setPrice('p1', 20); });
    expect(products[0].price).toBe(20);
    expect(storesApi.updateProduct).toHaveBeenCalledWith('p1', { price: 20 });
    expect(onError).not.toHaveBeenCalled();
  });

  it('reverte em falha e chama onError', async () => {
    (storesApi.updateProduct as any).mockRejectedValue(new Error('boom'));
    let products = [{ id: 'p1', price: 10 } as any];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const onError = jest.fn();
    const { result } = renderHook(() => useInlineProductMutations({ products, setProducts, onError }));
    await act(async () => { await result.current.setPrice('p1', 20); });
    expect(products[0].price).toBe(10);
    expect(onError).toHaveBeenCalled();
  });
});
