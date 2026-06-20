import { useCallback, useRef } from 'react';
import type { Product } from '../../../services/products';
import * as storesApi from '../../../services/storesApi';

interface Args {
  products: Product[];
  setProducts: (updater: (prev: Product[]) => Product[]) => void;
  onError: (err: unknown) => void;
}

export function useInlineProductMutations({ products, setProducts, onError }: Args) {
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const patchLocal = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, [setProducts]);

  const run = useCallback(async (id: string, patch: Partial<Product>, call: () => Promise<unknown>) => {
    const before = products.find((p) => p.id === id);
    patchLocal(id, patch);
    try { await call(); }
    catch (err) { if (before) patchLocal(id, before); onError(err); }
  }, [products, patchLocal, onError]);

  const setPrice = useCallback((id: string, price: number) =>
    run(id, { price }, () => storesApi.updateProduct(id, { price })), [run]);

  const setStatus = useCallback((id: string, active: boolean) =>
    run(id, { status: active ? 'active' : 'inactive' } as Partial<Product>,
      () => storesApi.updateProduct(id, { status: active ? 'active' : 'inactive' } as any)), [run]);

  const setFeatured = useCallback((id: string, featured: boolean) =>
    run(id, { featured } as Partial<Product>,
      () => storesApi.updateProduct(id, { featured } as any)), [run]);

  const setStock = useCallback((id: string, qty: number) => {
    patchLocal(id, { stock_quantity: qty } as Partial<Product>);
    clearTimeout(debouncers.current[id]);
    debouncers.current[id] = setTimeout(() => {
      storesApi.updateProductStock(id, qty, 'set').catch((err) => onError(err));
    }, 600);
  }, [patchLocal, onError]);

  return { setPrice, setStatus, setFeatured, setStock };
}
