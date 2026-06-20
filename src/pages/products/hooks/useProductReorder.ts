import { useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Product } from '../../../services/products';
import type { StoreCategory } from '../../../services/storesApi';
import * as storesApi from '../../../services/storesApi';
import { moveItem, reindex, diffSortOrders } from './reorderUtils';

interface Args {
  products: Product[];
  setProducts: (u: (prev: Product[]) => Product[]) => void;
  categories: StoreCategory[];
  setCategories: (u: (prev: StoreCategory[]) => StoreCategory[]) => void;
  onError: (e: unknown) => void;
}

export function useProductReorder({ products, setProducts, categories, setCategories, onError }: Args) {
  const onDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const type = (active.data.current as any)?.type;

    if (type === 'category') {
      const before = categories.map((c) => ({ id: c.id, sort_order: c.sort_order }));
      const ids = categories.map((c) => c.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      const reordered = moveItem(categories, from, to);
      const reidx = reindex(reordered);
      setCategories(() => reordered.map((c, i) => ({ ...c, sort_order: i })));
      const changed = diffSortOrders(before, reidx);
      try { await Promise.all(changed.map((c) => storesApi.updateCategory(c.id, { sort_order: c.sort_order }))); }
      catch (e) { setCategories(() => categories); onError(e); }
      return;
    }

    // produto
    const srcCat = (active.data.current as any)?.category ?? null;
    const dstCat = (over.data.current as any)?.category ?? srcCat;
    const snapshot = products;
    const inSrc = products.filter((p) => (p.category ?? null) === srcCat);

    if (srcCat === dstCat) {
      const before = inSrc.map((p) => ({ id: p.id, sort_order: p.sort_order ?? 0 }));
      const ids = inSrc.map((p) => p.id);
      const reordered = moveItem(inSrc, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      const reidx = reindex(reordered);
      const orderMap = new Map(reidx.map((r) => [r.id, r.sort_order]));
      setProducts((prev) => prev.map((p) => orderMap.has(p.id) ? { ...p, sort_order: orderMap.get(p.id)! } : p));
      const changed = diffSortOrders(before, reidx);
      try { await Promise.all(changed.map((c) => storesApi.updateProduct(c.id, { sort_order: c.sort_order }))); }
      catch (e) { setProducts(() => snapshot); onError(e); }
      return;
    }

    // mover entre categorias
    const moved = products.find((p) => p.id === String(active.id))!;
    const dstList = [...products.filter((p) => (p.category ?? null) === dstCat), moved];
    const reidx = reindex(dstList);
    const newOrder = reidx.find((r) => r.id === moved.id)!.sort_order;
    setProducts((prev) => prev.map((p) => p.id === moved.id ? { ...p, category: dstCat, sort_order: newOrder } : p));
    try { await storesApi.updateProduct(moved.id, { category: dstCat, sort_order: newOrder } as any); }
    catch (e) { setProducts(() => snapshot); onError(e); }
  }, [products, setProducts, categories, setCategories, onError]);

  return { onDragEnd };
}
