import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import * as storesApi from '../../services/storesApi';
import type { StoreCategory, StoreProductType } from '../../services/storesApi';
import type { Product } from '../../services/products';
import { useStore } from '../../hooks/useStore';
import { useToast } from '../../hooks/useToast';
import { groupProducts } from './hooks/useProductsGrouped';
import { useInlineProductMutations } from './hooks/useInlineProductMutations';
import { useProductReorder } from './hooks/useProductReorder';
import { useProducts } from '../../hooks/queries/useProducts';
import { ProductsToolbar } from './components/ProductsToolbar';
import { CategorySection } from './components/CategorySection';
import { AddCategoryModal } from './components/AddCategoryModal';
import { ProductFormModal } from './ProductFormModal';

export const ProductsPage: React.FC = () => {
  const { storeId } = useStore();
  const { error: showError } = useToast();

  // Produtos: fetch/cache/dedup via react-query; estado local é semeado a partir
  // da query e continua sendo a fonte para edição inline + reorder (otimista).
  const productsQuery = useProducts(storeId ?? undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [productTypes, setProductTypes] = useState<StoreProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string | null>>(new Set());
  const [reorderMode, setReorderMode] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addCatSaving, setAddCatSaving] = useState(false);
  const [modalProduct, setModalProduct] = useState<
    Product | null | { category?: string | null; [key: string]: unknown } | undefined
  >(undefined);

  const sid = storeId ?? undefined;

  const onError = (e: unknown) => {
    console.error(e);
    showError('Erro ao salvar');
  };

  // Categorias + tipos seguem em fetch manual (fora do escopo do react-query aqui).
  // Produtos são servidos por useProducts (cache por loja → sem spinner ao renavegar).
  const load = async () => {
    setLoading(true);
    try {
      const [cats, pt] = await Promise.all([
        storesApi.getCategories(sid),
        storesApi.getProductTypes(sid),
      ]);
      setCategories(Array.isArray(cats) ? cats : (cats?.results ?? []));
      setProductTypes(Array.isArray(pt) ? pt : (pt?.results ?? []));
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [storeId]);

  // Semeia o estado local de produtos a partir da query — preserva intacta a
  // edição inline e o drag-and-drop, que operam sobre `products`/`setProducts`.
  useEffect(() => {
    if (productsQuery.data) {
      const raw = productsQuery.data.results ?? [];
      setProducts(raw as unknown as Product[]);
    }
  }, [productsQuery.data]);

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

  // Lista achatada na ORDEM exibida (categoria + sort_order) — usada pelas setas ‹ › do modal
  const flatProducts = useMemo(() => groups.flatMap((g) => g.products), [groups]);

  // Ids de categorias reais (exclui o grupo "Sem categoria") — usado pelo SortableContext de categorias
  const categoryIds = useMemo(
    () => groups.map((g) => g.id).filter((id): id is string => !!id),
    [groups],
  );

  const handleCreateCategory = async (name: string) => {
    if (!sid) {
      onError(new Error('Nenhuma loja selecionada'));
      return;
    }
    setAddCatSaving(true);
    try {
      const nextOrder = categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), -1) + 1;
      await storesApi.createCategory({ store: sid, name, sort_order: nextOrder, is_active: true });
      setAddCatOpen(false);
      await load();
    } catch (e) {
      onError(e);
    } finally {
      setAddCatSaving(false);
    }
  };

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

  // Spinner apenas na carga inicial real (sem dados ainda). Na renavegação a
  // query de produtos vem do cache (isLoading=false) e não bloqueia a tela.
  const initialLoading = (loading || productsQuery.isLoading) && categories.length === 0 && products.length === 0;
  if (initialLoading) return <div>Carregando…</div>;

  return (
    <div className="p-4">
      <ProductsToolbar
        search={search}
        onSearch={setSearch}
        categoryFilter={categoryFilter}
        categories={categories}
        onCategoryFilter={setCategoryFilter}
        reorderMode={reorderMode}
        onReorderCategories={() => setReorderMode((v) => !v)}
        onAddCategory={() => setAddCatOpen(true)}
      />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
        {groups.map((g) => (
          <CategorySection
            key={String(g.id)}
            group={g}
            collapsed={collapsed.has(g.id)}
            rowHandlers={rowHandlers}
            reorderMode={reorderMode}
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
        </SortableContext>
      </DndContext>
      <AddCategoryModal
        isOpen={addCatOpen}
        saving={addCatSaving}
        onClose={() => setAddCatOpen(false)}
        onCreate={handleCreateCategory}
      />
      {modalProduct !== undefined && (
        <ProductFormModal
          isOpen
          product={modalProduct as any}
          categories={categories}
          flatProducts={flatProducts as any}
          storeId={sid}
          productTypes={productTypes}
          onClose={() => setModalProduct(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
};
