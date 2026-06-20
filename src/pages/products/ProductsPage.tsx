import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import * as storesApi from '../../services/storesApi';
import type { StoreCategory, StoreProductType } from '../../services/storesApi';
import type { Product } from '../../services/products';
import { useStore } from '../../hooks/useStore';
import { useToast } from '../../hooks/useToast';
import { groupProducts } from './hooks/useProductsGrouped';
import { useInlineProductMutations } from './hooks/useInlineProductMutations';
import { useProductReorder } from './hooks/useProductReorder';
import { ProductsToolbar } from './components/ProductsToolbar';
import { CategorySection } from './components/CategorySection';
import { ProductFormModal } from './ProductFormModal';

export const ProductsPage: React.FC = () => {
  const { storeId } = useStore();
  const { error: showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [productTypes, setProductTypes] = useState<StoreProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string | null>>(new Set());
  const [modalProduct, setModalProduct] = useState<
    Product | null | { category?: string | null; [key: string]: unknown } | undefined
  >(undefined);

  const sid = storeId ?? undefined;

  const onError = (e: unknown) => {
    console.error(e);
    showError('Erro ao salvar');
  };

  const load = async () => {
    setLoading(true);
    try {
      const [cats, prods, pt] = await Promise.all([
        storesApi.getCategories(sid),
        storesApi.getProducts({ store: sid }),
        storesApi.getProductTypes(sid),
      ]);
      setCategories(Array.isArray(cats) ? cats : (cats?.results ?? []));
      const rawProds = Array.isArray(prods) ? prods : (prods?.results ?? []);
      setProducts(rawProds as unknown as Product[]);
      setProductTypes(Array.isArray(pt) ? pt : (pt?.results ?? []));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mut = useInlineProductMutations({ products, setProducts, onError });
  const { onDragEnd } = useProductReorder({ products, setProducts, categories, setCategories, onError });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((p) =>
      (!categoryFilter || p.category === categoryFilter) &&
      (!term || p.name.toLowerCase().includes(term))
    );
    return groupProducts(filtered, categories);
  }, [products, categories, search, categoryFilter]);

  const rowHandlers = {
    onOpen: (p: Product) => setModalProduct(p),
    onStock: mut.setStock,
    onPrice: mut.setPrice,
    onStatus: mut.setStatus,
    onFeatured: mut.setFeatured,
    onMenuAction: (id: string, action: string) => {
      if (action === 'edit') setModalProduct(products.find((p) => p.id === id) ?? null);
    },
  };

  if (loading) return <div>Carregando…</div>;

  return (
    <div className="p-4">
      <ProductsToolbar
        search={search}
        onSearch={setSearch}
        categoryFilter={categoryFilter}
        categories={categories}
        onCategoryFilter={setCategoryFilter}
        onReorderCategories={() => {}}
        onAddCategory={() => {}}
      />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {groups.map((g) => (
          <CategorySection
            key={String(g.id)}
            group={g}
            collapsed={collapsed.has(g.id)}
            rowHandlers={rowHandlers}
            onToggleCollapse={() =>
              setCollapsed((s) => {
                const n = new Set(s);
                n.has(g.id) ? n.delete(g.id) : n.add(g.id);
                return n;
              })
            }
            onTogglePause={async (active) => {
              if (g.id) {
                try {
                  await storesApi.updateCategory(g.id, { is_active: active });
                  setCategories((cs) => cs.map((c) => (c.id === g.id ? { ...c, is_active: active } : c)));
                } catch (e) {
                  onError(e);
                }
              }
            }}
            onAddItem={(catId) => setModalProduct({ category: catId })}
          />
        ))}
      </DndContext>
      {modalProduct !== undefined && (
        <ProductFormModal
          isOpen
          product={modalProduct as any}
          categories={categories}
          flatProducts={products as any}
          storeId={sid}
          productTypes={productTypes}
          onClose={() => setModalProduct(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
};
