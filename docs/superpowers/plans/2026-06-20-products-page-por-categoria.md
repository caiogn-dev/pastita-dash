# Página de Produtos por Categoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as views grid/list da página de produtos por uma lista densa agrupada por categoria, com edição inline (estoque/preço/status/destaque) e reordenação por arraste que reflete no storefront.

**Architecture:** Container `ProductsPage` busca produtos (flat) + categorias, agrupa no client por `sort_order`, e renderiza seções (`CategorySection`) com linhas densas (`ProductRow`). Edições inline e reorder são optimistic com rollback, persistindo via `storesApi`. O god file `ProductsPageNew.tsx` é quebrado em componentes/hooks focados. Drag via @dnd-kit seguindo o padrão de `OrdersKanban.tsx`.

**Tech Stack:** React + TypeScript + Vite, vitest (`npm test`), @dnd-kit/core+sortable, framer-motion, serviços em `src/services/storesApi.ts`.

## Global Constraints

- Serviço de mutação: usar `storesApi` (`src/services/storesApi.ts`) — NÃO `src/services/products.ts`.
- Campos reais: status = `status: 'active' | 'inactive'`; destaque = `featured: boolean`; estoque via `updateProductStock(id, qty, 'set')`; preço = `price: number`; ordem = `sort_order: number`; categoria = `category: string|null`.
- Categoria: `updateCategory(id, { sort_order })` e `updateCategory(id, { is_active })`.
- Navegação do painel é `src/components/layout/Navbar.tsx` (Sidebar é legado). Rota da página não muda; só o conteúdo.
- Toda edição inline e reorder é optimistic com rollback + toast em falha.
- Endpoints disponíveis: `getProducts(params)`, `updateProduct(id, partial)`, `updateProductStock(id, qty, op)`, `deleteProduct(id)`, `duplicateProduct(id)`, `getCategories()`, `createCategory`, `updateCategory`.
- Testes em `src/__tests__/` ou colocados `*.test.ts(x)`; rodar com `npm test`.
- Commits frequentes, mensagens em português.

---

## Task 1: Hook de agrupamento `useProductsGrouped`

**Files:**
- Create: `src/pages/products/hooks/useProductsGrouped.ts`
- Test: `src/pages/products/hooks/useProductsGrouped.test.ts`

**Interfaces:**
- Consumes: `Product` (`status`, `category`, `category_name`, `sort_order`), `StoreCategory` (`id`, `name`, `sort_order`, `is_active`).
- Produces: `groupProducts(products: Product[], categories: StoreCategory[]): CategoryGroup[]` onde `CategoryGroup = { id: string|null; name: string; is_active: boolean; sort_order: number; products: Product[] }`. Categorias ordenadas por `sort_order`; produtos por `sort_order`. Produtos sem `category` agrupados num grupo `{ id: null, name: 'Sem categoria' }` no fim.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { groupProducts, CategoryGroup } from './useProductsGrouped';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/hooks/useProductsGrouped.test.ts`
Expected: FAIL ("groupProducts is not a function" / módulo não encontrado).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Product } from '../../../services/products';
import type { StoreCategory } from '../../../services/storesApi';

export interface CategoryGroup {
  id: string | null;
  name: string;
  is_active: boolean;
  sort_order: number;
  products: Product[];
}

const bySortOrder = <T extends { sort_order?: number }>(a: T, b: T) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function groupProducts(products: Product[], categories: StoreCategory[]): CategoryGroup[] {
  const cats = [...categories].sort(bySortOrder);
  const groups: CategoryGroup[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    is_active: c.is_active,
    sort_order: c.sort_order,
    products: products
      .filter((p) => p.category === c.id)
      .sort(bySortOrder),
  }));

  const uncategorized = products.filter((p) => !p.category).sort(bySortOrder);
  if (uncategorized.length) {
    groups.push({ id: null, name: 'Sem categoria', is_active: true, sort_order: Infinity, products: uncategorized });
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/hooks/useProductsGrouped.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/hooks/useProductsGrouped.ts src/pages/products/hooks/useProductsGrouped.test.ts
git commit -m "feat(produtos): hook groupProducts (agrupar/ordenar por categoria)"
```

---

## Task 2: Lógica de reindex `reorderUtils`

**Files:**
- Create: `src/pages/products/hooks/reorderUtils.ts`
- Test: `src/pages/products/hooks/reorderUtils.test.ts`

**Interfaces:**
- Produces:
  - `reindex<T extends {id:string}>(items: T[]): Array<{id:string; sort_order:number}>` — devolve id→novo índice (0-based) para todos.
  - `moveItem<T>(items: T[], from: number, to: number): T[]` — array reordenado.
  - `diffSortOrders(before: Array<{id:string;sort_order:number}>, after: Array<{id:string;sort_order:number}>): Array<{id:string;sort_order:number}>` — só os que mudaram.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { reindex, moveItem, diffSortOrders } from './reorderUtils';

describe('reorderUtils', () => {
  it('moveItem reordena', () => {
    expect(moveItem(['a','b','c'], 0, 2)).toEqual(['b','c','a']);
  });
  it('reindex numera 0..n', () => {
    expect(reindex([{id:'a'},{id:'b'}])).toEqual([{id:'a',sort_order:0},{id:'b',sort_order:1}]);
  });
  it('diffSortOrders retorna só os alterados', () => {
    const before = [{id:'a',sort_order:0},{id:'b',sort_order:1}];
    const after = [{id:'b',sort_order:0},{id:'a',sort_order:1}];
    expect(diffSortOrders(before, after).sort((x,y)=>x.id<y.id?-1:1))
      .toEqual([{id:'a',sort_order:1},{id:'b',sort_order:0}]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/hooks/reorderUtils.test.ts`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Write minimal implementation**

```ts
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export function reindex<T extends { id: string }>(items: T[]) {
  return items.map((it, i) => ({ id: it.id, sort_order: i }));
}

export function diffSortOrders(
  before: Array<{ id: string; sort_order: number }>,
  after: Array<{ id: string; sort_order: number }>,
) {
  const prev = new Map(before.map((b) => [b.id, b.sort_order]));
  return after.filter((a) => prev.get(a.id) !== a.sort_order);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/hooks/reorderUtils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/hooks/reorderUtils.ts src/pages/products/hooks/reorderUtils.test.ts
git commit -m "feat(produtos): utils de reindex/move/diff para reorder"
```

---

## Task 3: `InlineStockStepper`

**Files:**
- Create: `src/pages/products/components/InlineStockStepper.tsx`
- Test: `src/pages/products/components/InlineStockStepper.test.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `InlineStockStepper({ value: number; disabled?: boolean; onChange: (next: number) => void })` — botões `−`/`+` e número; `−` não desce abaixo de 0; chama `onChange(next)` a cada clique. O debounce/persistência fica no consumidor (Task 7), não aqui.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineStockStepper } from './InlineStockStepper';

describe('InlineStockStepper', () => {
  it('incrementa e decrementa, sem passar de 0', () => {
    const onChange = vi.fn();
    const { rerender } = render(<InlineStockStepper value={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('aumentar estoque'));
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByLabelText('diminuir estoque'));
    expect(onChange).toHaveBeenLastCalledWith(0);
    rerender(<InlineStockStepper value={0} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('diminuir estoque'));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/InlineStockStepper.test.tsx`
Expected: FAIL (componente não existe).

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';

interface Props {
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}

export const InlineStockStepper: React.FC<Props> = ({ value, disabled, onChange }) => (
  <div className="inline-flex items-center gap-1">
    <button
      type="button"
      aria-label="diminuir estoque"
      disabled={disabled}
      className="h-7 w-7 rounded border text-danger-token disabled:opacity-40"
      onClick={() => onChange(Math.max(0, value - 1))}
    >−</button>
    <span className="min-w-[2ch] text-center tabular-nums">{value}</span>
    <button
      type="button"
      aria-label="aumentar estoque"
      disabled={disabled}
      className="h-7 w-7 rounded border text-success-token disabled:opacity-40"
      onClick={() => onChange(value + 1)}
    >+</button>
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/InlineStockStepper.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/InlineStockStepper.tsx src/pages/products/components/InlineStockStepper.test.tsx
git commit -m "feat(produtos): InlineStockStepper (− N +)"
```

---

## Task 4: `InlinePriceField`

**Files:**
- Create: `src/pages/products/components/InlinePriceField.tsx`
- Test: `src/pages/products/components/InlinePriceField.test.tsx`

**Interfaces:**
- Produces: `InlinePriceField({ value: number; onCommit: (next: number) => void })` — input numérico; chama `onCommit(parsed)` no blur e no Enter, só se o valor mudou; valor inválido (NaN) é ignorado (não chama onCommit).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlinePriceField } from './InlinePriceField';

describe('InlinePriceField', () => {
  it('commita no blur quando muda', () => {
    const onCommit = vi.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('preço') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15.5' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(15.5);
  });
  it('não commita se igual ou inválido', () => {
    const onCommit = vi.fn();
    render(<InlinePriceField value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('preço');
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/InlinePriceField.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React, { useState } from 'react';

interface Props {
  value: number;
  onCommit: (next: number) => void;
}

export const InlinePriceField: React.FC<Props> = ({ value, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed !== value) onCommit(parsed);
  };
  return (
    <input
      aria-label="preço"
      inputMode="decimal"
      className="w-24 rounded border px-2 py-1 text-right tabular-nums"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/InlinePriceField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/InlinePriceField.tsx src/pages/products/components/InlinePriceField.test.tsx
git commit -m "feat(produtos): InlinePriceField (commit no blur/Enter)"
```

---

## Task 5: `InlineToggle` (status e destaque)

**Files:**
- Create: `src/pages/products/components/InlineToggle.tsx`
- Test: `src/pages/products/components/InlineToggle.test.tsx`

**Interfaces:**
- Produces:
  - `StatusToggle({ active: boolean; onChange: (active: boolean) => void })` — botão segmentado Pausado|Ativo; clicar em "Ativo" → `onChange(true)`, "Pausado" → `onChange(false)`.
  - `FeaturedToggle({ featured: boolean; onChange: (featured: boolean) => void })` — estrela; alterna.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusToggle, FeaturedToggle } from './InlineToggle';

describe('InlineToggle', () => {
  it('StatusToggle chama onChange com o novo estado', () => {
    const onChange = vi.fn();
    render(<StatusToggle active={false} onChange={onChange} />);
    fireEvent.click(screen.getByText('Ativo'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('FeaturedToggle alterna', () => {
    const onChange = vi.fn();
    render(<FeaturedToggle featured={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('destacar'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/InlineToggle.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { Star } from 'lucide-react';

export const StatusToggle: React.FC<{ active: boolean; onChange: (a: boolean) => void }> = ({ active, onChange }) => (
  <div className="inline-flex overflow-hidden rounded border text-xs">
    <button type="button" onClick={() => onChange(false)}
      className={!active ? 'bg-danger-token px-2 py-1 text-white' : 'px-2 py-1'}>Pausado</button>
    <button type="button" onClick={() => onChange(true)}
      className={active ? 'bg-success-token px-2 py-1 text-white' : 'px-2 py-1'}>Ativo</button>
  </div>
);

export const FeaturedToggle: React.FC<{ featured: boolean; onChange: (f: boolean) => void }> = ({ featured, onChange }) => (
  <button type="button" aria-label="destacar" onClick={() => onChange(!featured)}>
    <Star size={16} className={featured ? 'fill-warning-token text-warning-token' : 'text-fg-muted-token'} />
  </button>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/InlineToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/InlineToggle.tsx src/pages/products/components/InlineToggle.test.tsx
git commit -m "feat(produtos): InlineToggle (status + destaque)"
```

---

## Task 6: Hook de mutações optimistic `useInlineProductMutations`

**Files:**
- Create: `src/pages/products/hooks/useInlineProductMutations.ts`
- Test: `src/pages/products/hooks/useInlineProductMutations.test.ts`

**Interfaces:**
- Consumes: `storesApi.updateProduct`, `storesApi.updateProductStock`.
- Produces: hook `useInlineProductMutations({ products, setProducts, onError })` que retorna `{ setStock(id, qty), setPrice(id, price), setStatus(id, active), setFeatured(id, featured) }`. Cada um: aplica no estado via `setProducts` na hora; chama o endpoint; em erro, **reverte** ao snapshot anterior e chama `onError(err)`. `setStock` usa debounce ~600ms por id antes de chamar `updateProductStock(id, qty, 'set')`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInlineProductMutations } from './useInlineProductMutations';
import * as storesApi from '../../../services/storesApi';

vi.mock('../../../services/storesApi');

describe('useInlineProductMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setPrice aplica optimistic e persiste', async () => {
    (storesApi.updateProduct as any).mockResolvedValue({});
    let products = [{ id: 'p1', price: 10 } as any];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const onError = vi.fn();
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
    const onError = vi.fn();
    const { result } = renderHook(() => useInlineProductMutations({ products, setProducts, onError }));
    await act(async () => { await result.current.setPrice('p1', 20); });
    expect(products[0].price).toBe(10);
    expect(onError).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/hooks/useInlineProductMutations.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/hooks/useInlineProductMutations.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/hooks/useInlineProductMutations.ts src/pages/products/hooks/useInlineProductMutations.test.ts
git commit -m "feat(produtos): hook de mutações inline optimistic + rollback"
```

---

## Task 7: `ProductRow` (linha densa sortable)

**Files:**
- Create: `src/pages/products/components/ProductRow.tsx`
- Test: `src/pages/products/components/ProductRow.test.tsx`

**Interfaces:**
- Consumes: `InlineStockStepper`, `InlinePriceField`, `StatusToggle`, `FeaturedToggle`, `Product`.
- Produces: `ProductRow({ product, onStock, onPrice, onStatus, onFeatured, onOpen, onMenuAction })`. Renderiza: alça (☰), thumb (`main_image_url||image_url`), nome (+ ⭐ se featured, 🏷️ se combo/tag), `InlineStockStepper` só se `product.track_stock`, `InlinePriceField`, `StatusToggle`, `FeaturedToggle`, e ⋮ (menu: editar/duplicar/excluir → `onMenuAction(action)`). Clique na área do nome chama `onOpen(product)`. Usa `useSortable({ id: product.id })` (padrão de `OrdersKanban.tsx`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { ProductRow } from './ProductRow';

const wrap = (ui: React.ReactNode) =>
  <DndContext><SortableContext items={['p1']}>{ui}</SortableContext></DndContext>;

const base = { id: 'p1', name: 'Arroz', price: 6.8, stock_quantity: 47, track_stock: true, featured: false, status: 'active' } as any;

describe('ProductRow', () => {
  it('mostra estepper só com track_stock e abre no clique do nome', () => {
    const onOpen = vi.fn();
    render(wrap(<ProductRow product={base} onOpen={onOpen} onStock={vi.fn()} onPrice={vi.fn()} onStatus={vi.fn()} onFeatured={vi.fn()} onMenuAction={vi.fn()} />));
    expect(screen.getByLabelText('aumentar estoque')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Arroz'));
    expect(onOpen).toHaveBeenCalledWith(base);
  });
  it('esconde estepper sem track_stock', () => {
    render(wrap(<ProductRow product={{ ...base, track_stock: false }} onOpen={vi.fn()} onStock={vi.fn()} onPrice={vi.fn()} onStatus={vi.fn()} onFeatured={vi.fn()} onMenuAction={vi.fn()} />));
    expect(screen.queryByLabelText('aumentar estoque')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/ProductRow.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical } from 'lucide-react';
import type { Product } from '../../../services/products';
import { InlineStockStepper } from './InlineStockStepper';
import { InlinePriceField } from './InlinePriceField';
import { StatusToggle, FeaturedToggle } from './InlineToggle';

export type RowMenuAction = 'edit' | 'duplicate' | 'delete';
interface Props {
  product: Product;
  onOpen: (p: Product) => void;
  onStock: (id: string, qty: number) => void;
  onPrice: (id: string, price: number) => void;
  onStatus: (id: string, active: boolean) => void;
  onFeatured: (id: string, featured: boolean) => void;
  onMenuAction: (id: string, action: RowMenuAction) => void;
}

export const ProductRow: React.FC<Props> = ({ product, onOpen, onStock, onPrice, onStatus, onFeatured, onMenuAction }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const img = (product as any).main_image_url || product.image_url || product.image;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 border-b px-3 py-2">
      <button {...attributes} {...listeners} aria-label="arrastar" className="cursor-grab text-fg-muted-token"><GripVertical size={16} /></button>
      {img ? <img src={img} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-surface-muted-token" />}
      <button className="flex-1 text-left" onClick={() => onOpen(product)}>{product.name}</button>
      {product.track_stock && <InlineStockStepper value={product.stock_quantity} onChange={(q) => onStock(product.id, q)} />}
      <InlinePriceField value={product.price} onCommit={(v) => onPrice(product.id, v)} />
      <StatusToggle active={product.status === 'active'} onChange={(a) => onStatus(product.id, a)} />
      <FeaturedToggle featured={!!product.featured} onChange={(f) => onFeatured(product.id, f)} />
      <button aria-label="menu" onClick={() => onMenuAction(product.id, 'edit')}><MoreVertical size={16} /></button>
    </div>
  );
};
```

(Nota: o menu ⋮ abre um dropdown real na Task 10; aqui dispara `edit` direto pra manter o teste simples — o dropdown é incremento de UI, não muda a interface `onMenuAction`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/ProductRow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/ProductRow.tsx src/pages/products/components/ProductRow.test.tsx
git commit -m "feat(produtos): ProductRow (linha densa sortable com inline)"
```

---

## Task 8: `CategorySection` + `CategoryHeader`

**Files:**
- Create: `src/pages/products/components/CategoryHeader.tsx`
- Create: `src/pages/products/components/CategorySection.tsx`
- Test: `src/pages/products/components/CategorySection.test.tsx`

**Interfaces:**
- Consumes: `CategoryGroup` (Task 1), `ProductRow` (Task 7), `StatusToggle`.
- Produces:
  - `CategoryHeader({ group, collapsed, onToggleCollapse, onTogglePause, onAddItem, onMenuAction })`.
  - `CategorySection({ group, collapsed, rowHandlers, onToggleCollapse, onTogglePause, onAddItem })` — header + `SortableContext` com as `ProductRow` (esconde quando colapsado) + "+ Adicionar novo item". `rowHandlers` repassa os callbacks da Task 7.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { CategorySection } from './CategorySection';

const group = { id: 'a', name: 'Almoço', is_active: true, sort_order: 1,
  products: [{ id: 'p1', name: 'Arroz', price: 6.8, stock_quantity: 1, track_stock: false, status: 'active' } as any] };
const handlers = { onOpen: vi.fn(), onStock: vi.fn(), onPrice: vi.fn(), onStatus: vi.fn(), onFeatured: vi.fn(), onMenuAction: vi.fn() };

describe('CategorySection', () => {
  it('mostra nome e produtos; colapsado esconde produtos', () => {
    const { rerender } = render(<DndContext><CategorySection group={group} collapsed={false} rowHandlers={handlers} onToggleCollapse={vi.fn()} onTogglePause={vi.fn()} onAddItem={vi.fn()} /></DndContext>);
    expect(screen.getByText('Almoço')).toBeInTheDocument();
    expect(screen.getByText('Arroz')).toBeInTheDocument();
    rerender(<DndContext><CategorySection group={group} collapsed rowHandlers={handlers} onToggleCollapse={vi.fn()} onTogglePause={vi.fn()} onAddItem={vi.fn()} /></DndContext>);
    expect(screen.queryByText('Arroz')).toBeNull();
  });
  it('"adicionar item" dispara callback com id da categoria', () => {
    const onAddItem = vi.fn();
    render(<DndContext><CategorySection group={group} collapsed={false} rowHandlers={handlers} onToggleCollapse={vi.fn()} onTogglePause={vi.fn()} onAddItem={onAddItem} /></DndContext>);
    fireEvent.click(screen.getByText(/adicionar novo item/i));
    expect(onAddItem).toHaveBeenCalledWith('a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/CategorySection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`CategoryHeader.tsx`:
```tsx
import React from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { StatusToggle } from './InlineToggle';
import type { CategoryGroup } from '../hooks/useProductsGrouped';

interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
}
export const CategoryHeader: React.FC<Props> = ({ group, collapsed, onToggleCollapse, onTogglePause }) => (
  <div className="flex items-center justify-between px-3 py-2">
    <button className="flex items-center gap-2 font-semibold text-primary-token" onClick={onToggleCollapse}>
      {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      {group.name} <span className="text-xs text-fg-muted-token">({group.products.length})</span>
    </button>
    {group.id && <StatusToggle active={group.is_active} onChange={onTogglePause} />}
  </div>
);
```

`CategorySection.tsx`:
```tsx
import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { CategoryHeader } from './CategoryHeader';
import { ProductRow, RowMenuAction } from './ProductRow';
import type { CategoryGroup } from '../hooks/useProductsGrouped';
import type { Product } from '../../../services/products';

export interface RowHandlers {
  onOpen: (p: Product) => void;
  onStock: (id: string, qty: number) => void;
  onPrice: (id: string, price: number) => void;
  onStatus: (id: string, active: boolean) => void;
  onFeatured: (id: string, featured: boolean) => void;
  onMenuAction: (id: string, action: RowMenuAction) => void;
}
interface Props {
  group: CategoryGroup;
  collapsed: boolean;
  rowHandlers: RowHandlers;
  onToggleCollapse: () => void;
  onTogglePause: (active: boolean) => void;
  onAddItem: (categoryId: string | null) => void;
}
export const CategorySection: React.FC<Props> = ({ group, collapsed, rowHandlers, onToggleCollapse, onTogglePause, onAddItem }) => (
  <section className="mb-4 rounded-lg border bg-surface-token">
    <CategoryHeader group={group} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onTogglePause={onTogglePause} />
    {!collapsed && (
      <>
        <SortableContext items={group.products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {group.products.map((p) => (
            <ProductRow key={p.id} product={p}
              onOpen={rowHandlers.onOpen} onStock={rowHandlers.onStock} onPrice={rowHandlers.onPrice}
              onStatus={rowHandlers.onStatus} onFeatured={rowHandlers.onFeatured} onMenuAction={rowHandlers.onMenuAction} />
          ))}
        </SortableContext>
        <button className="flex items-center gap-1 px-3 py-2 text-sm text-primary-token" onClick={() => onAddItem(group.id)}>
          <Plus size={14} /> Adicionar novo item
        </button>
      </>
    )}
  </section>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/CategorySection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/CategoryHeader.tsx src/pages/products/components/CategorySection.tsx src/pages/products/components/CategorySection.test.tsx
git commit -m "feat(produtos): CategorySection + CategoryHeader (accordion + pausar)"
```

---

## Task 9: Wiring de drag (reorder + mover entre categorias) no container parcial

**Files:**
- Create: `src/pages/products/hooks/useProductReorder.ts`
- Test: `src/pages/products/hooks/useProductReorder.test.ts`

**Interfaces:**
- Consumes: `reorderUtils` (Task 2), `storesApi.updateProduct`, `storesApi.updateCategory`.
- Produces: hook `useProductReorder({ groups, products, setProducts, categories, setCategories, onError })` retornando `{ onDragEnd(event) }` que trata 3 casos a partir do `DragEndEvent` do @dnd-kit:
  1. produto movido na mesma categoria → reindex local + `updateProduct(id, { sort_order })` dos alterados (via `diffSortOrders`).
  2. produto movido pra outra categoria → `updateProduct(movedId, { category: destCat, sort_order })` + reindex das duas listas.
  3. categoria movida → reindex categorias + `updateCategory(id, { sort_order })` dos alterados.
  Optimistic + rollback no snapshot em erro.

- [ ] **Step 1: Write the failing test** (foco no caso 1, reorder na mesma categoria)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductReorder } from './useProductReorder';
import * as storesApi from '../../../services/storesApi';
vi.mock('../../../services/storesApi');

describe('useProductReorder', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reordena produtos na mesma categoria e persiste só os alterados', async () => {
    (storesApi.updateProduct as any).mockResolvedValue({});
    let products = [
      { id: 'p1', category: 'a', sort_order: 0 },
      { id: 'p2', category: 'a', sort_order: 1 },
    ] as any[];
    const setProducts = (fn: any) => { products = typeof fn === 'function' ? fn(products) : fn; };
    const { result } = renderHook(() => useProductReorder({
      products, setProducts, categories: [{ id: 'a', sort_order: 0 } as any],
      setCategories: () => {}, onError: vi.fn(),
    }));
    await act(async () => {
      await result.current.onDragEnd({ active: { id: 'p1', data: { current: { type: 'product', category: 'a' } } }, over: { id: 'p2', data: { current: { type: 'product', category: 'a' } } } } as any);
    });
    expect(products.find((p) => p.id === 'p1').sort_order).toBe(1);
    expect(storesApi.updateProduct).toHaveBeenCalledWith('p1', { sort_order: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/hooks/useProductReorder.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/hooks/useProductReorder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/hooks/useProductReorder.ts src/pages/products/hooks/useProductReorder.test.ts
git commit -m "feat(produtos): hook de reorder (mesma cat, entre cats, categorias)"
```

---

## Task 10: `ProductsToolbar`

**Files:**
- Create: `src/pages/products/components/ProductsToolbar.tsx`
- Test: `src/pages/products/components/ProductsToolbar.test.tsx`

**Interfaces:**
- Produces: `ProductsToolbar({ search, onSearch, categoryFilter, categories, onCategoryFilter, onReorderCategories, onAddCategory })`. Campo de busca (onChange → onSearch), select de categoria (onChange → onCategoryFilter), botões "Ordenar categorias" (→ onReorderCategories) e "+ Adicionar categoria" (→ onAddCategory).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsToolbar } from './ProductsToolbar';

describe('ProductsToolbar', () => {
  it('dispara busca e botões', () => {
    const onSearch = vi.fn(); const onAddCategory = vi.fn(); const onReorderCategories = vi.fn();
    render(<ProductsToolbar search="" onSearch={onSearch} categoryFilter="" categories={[]} onCategoryFilter={vi.fn()} onReorderCategories={onReorderCategories} onAddCategory={onAddCategory} />);
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'arroz' } });
    expect(onSearch).toHaveBeenCalledWith('arroz');
    fireEvent.click(screen.getByText(/ordenar categorias/i));
    expect(onReorderCategories).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/adicionar categoria/i));
    expect(onAddCategory).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/components/ProductsToolbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import type { StoreCategory } from '../../../services/storesApi';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  categoryFilter: string;
  categories: StoreCategory[];
  onCategoryFilter: (v: string) => void;
  onReorderCategories: () => void;
  onAddCategory: () => void;
}
export const ProductsToolbar: React.FC<Props> = ({ search, onSearch, categoryFilter, categories, onCategoryFilter, onReorderCategories, onAddCategory }) => (
  <div className="mb-4 flex flex-wrap items-center gap-2">
    <div className="relative flex-1 min-w-[200px]">
      <Search size={16} className="absolute left-2 top-2.5 text-fg-muted-token" />
      <input className="w-full rounded border py-2 pl-8 pr-3" placeholder="Buscar produto..." value={search} onChange={(e) => onSearch(e.target.value)} />
    </div>
    <select className="rounded border px-3 py-2" value={categoryFilter} onChange={(e) => onCategoryFilter(e.target.value)}>
      <option value="">Todas as categorias</option>
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <button className="flex items-center gap-1 rounded bg-primary-token px-3 py-2 text-white" onClick={onReorderCategories}><ArrowUpDown size={16} /> Ordenar categorias</button>
    <button className="flex items-center gap-1 rounded bg-primary-token px-3 py-2 text-white" onClick={onAddCategory}><Plus size={16} /> Adicionar categoria</button>
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/components/ProductsToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/components/ProductsToolbar.tsx src/pages/products/components/ProductsToolbar.test.tsx
git commit -m "feat(produtos): ProductsToolbar (busca, filtro, ordenar/add categoria)"
```

---

## Task 11: Container `ProductsPage` (montagem + cutover)

**Files:**
- Create: `src/pages/products/ProductsPage.tsx`
- Modify: `src/pages/products/index.ts` (exportar `ProductsPage` no lugar do antigo)
- Test: `src/pages/products/ProductsPage.test.tsx`

**Interfaces:**
- Consumes: tudo das tasks 1–10 + `storesApi.getProducts`, `storesApi.getCategories`, `ProductFormModal` (Task 12 — importar como `./ProductFormModal`; até a Task 12 existir, importar do arquivo antigo se necessário, mas a ordem recomendada faz Task 12 antes do cutover final).
- Produces: página completa. Estado: `products`, `categories`, `loading`, `search`, `categoryFilter`, `collapsed:Set`, `modalProduct`. Monta `DndContext` (sensors padrão de `OrdersKanban.tsx`) com `onDragEnd` do `useProductReorder`; renderiza `ProductsToolbar` + `groupProducts(...).filter(busca/categoria)` → `CategorySection`. Toast via util existente do projeto (verificar `src/components/common` ou `useToast`).

- [ ] **Step 1: Write the failing test** (render + agrupamento end-to-end com mocks)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductsPage } from './ProductsPage';
import * as storesApi from '../../services/storesApi';
vi.mock('../../services/storesApi');

describe('ProductsPage', () => {
  beforeEach(() => {
    (storesApi.getCategories as any).mockResolvedValue([{ id: 'a', name: 'Almoço', sort_order: 1, is_active: true }]);
    (storesApi.getProducts as any).mockResolvedValue({ results: [{ id: 'p1', name: 'Arroz', price: 6.8, stock_quantity: 1, track_stock: false, status: 'active', category: 'a', sort_order: 0 }] });
  });
  it('renderiza categorias e produtos agrupados', async () => {
    render(<ProductsPage />);
    await waitFor(() => expect(screen.getByText('Almoço')).toBeInTheDocument());
    expect(screen.getByText('Arroz')).toBeInTheDocument();
  });
});
```

(Ajustar o shape de retorno de `getProducts`/`getCategories` ao real — conferir se vem `{results}` ou array direto e adaptar o mock e o container juntos.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/ProductsPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Implementar `ProductsPage.tsx` montando os componentes. Esqueleto:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import * as storesApi from '../../services/storesApi';
import type { Product } from '../../services/products';
import type { StoreCategory } from '../../services/storesApi';
import { groupProducts } from './hooks/useProductsGrouped';
import { useInlineProductMutations } from './hooks/useInlineProductMutations';
import { useProductReorder } from './hooks/useProductReorder';
import { ProductsToolbar } from './components/ProductsToolbar';
import { CategorySection } from './components/CategorySection';
import { ProductFormModal } from './ProductFormModal';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string | null>>(new Set());
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined); // undefined=fechado

  const onError = (e: unknown) => { console.error(e); /* TODO: usar toast real do projeto */ };

  const load = async () => {
    setLoading(true);
    const [cats, prods] = await Promise.all([storesApi.getCategories(), storesApi.getProducts()]);
    setCategories(Array.isArray(cats) ? cats : (cats as any).results ?? []);
    setProducts(((prods as any).results ?? prods) as Product[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const mut = useInlineProductMutations({ products, setProducts, onError });
  const { onDragEnd } = useProductReorder({ products, setProducts, categories, setCategories, onError });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((p) =>
      (!categoryFilter || p.category === categoryFilter) &&
      (!term || p.name.toLowerCase().includes(term)));
    return groupProducts(filtered, categories);
  }, [products, categories, search, categoryFilter]);

  const rowHandlers = {
    onOpen: (p: Product) => setModalProduct(p),
    onStock: mut.setStock, onPrice: mut.setPrice, onStatus: mut.setStatus, onFeatured: mut.setFeatured,
    onMenuAction: (id: string, action: string) => { if (action === 'edit') setModalProduct(products.find((p) => p.id === id) ?? null); },
  };

  if (loading) return <div>Carregando…</div>;
  return (
    <div className="p-4">
      <ProductsToolbar search={search} onSearch={setSearch} categoryFilter={categoryFilter}
        categories={categories} onCategoryFilter={setCategoryFilter}
        onReorderCategories={() => {/* ativa modo drag de categoria — usa mesma lista */}}
        onAddCategory={() => {/* abre modal de categoria (reuso do existente) */}} />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {groups.map((g) => (
          <CategorySection key={String(g.id)} group={g}
            collapsed={collapsed.has(g.id)} rowHandlers={rowHandlers}
            onToggleCollapse={() => setCollapsed((s) => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}
            onTogglePause={async (active) => { if (g.id) { try { await storesApi.updateCategory(g.id, { is_active: active }); setCategories((cs) => cs.map((c) => c.id === g.id ? { ...c, is_active: active } : c)); } catch (e) { onError(e); } } }}
            onAddItem={(catId) => setModalProduct({ category: catId } as Product)} />
        ))}
      </DndContext>
      {modalProduct !== undefined && (
        <ProductFormModal isOpen product={modalProduct} categories={categories}
          flatProducts={products} onClose={() => setModalProduct(undefined)} onSaved={load} />
      )}
    </div>
  );
};
```

(O `ProductFormModal` é a Task 12; os comentários `TODO` de toast/categoria são ligados nas tasks 12/13 — não deixar `TODO` no merge final.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/ProductsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/ProductsPage.tsx src/pages/products/ProductsPage.test.tsx src/pages/products/index.ts
git commit -m "feat(produtos): container ProductsPage (lista densa por categoria)"
```

---

## Task 12: Extrair `ProductFormModal` + galeria + setas prev/next

**Files:**
- Create: `src/pages/products/ProductFormModal.tsx` (mover o componente de dentro de `ProductsPageNew.tsx`)
- Test: `src/pages/products/ProductFormModal.test.tsx`

**Interfaces:**
- Produces: `ProductFormModal({ isOpen, product, categories, flatProducts, onClose, onSaved })`. Mantém abas/campos atuais. Adiciona: imagem principal grande + galeria (campos já existentes no form atual — `main_image`, imagens extras se houver), e **setas ‹ ›** que trocam o produto editado pelo anterior/próximo de `flatProducts` (lista já ordenada) sem fechar. `product === null` ou `{category}` = criação.

- [ ] **Step 1: Write the failing test** (navegação prev/next)

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductFormModal } from './ProductFormModal';

const flat = [{ id: 'p1', name: 'Arroz' }, { id: 'p2', name: 'Feijão' }] as any[];

describe('ProductFormModal', () => {
  it('seta › navega pro próximo produto', () => {
    render(<ProductFormModal isOpen product={flat[0]} categories={[]} flatProducts={flat} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByDisplayValue('Arroz')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('próximo produto'));
    expect(screen.getByDisplayValue('Feijão')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/products/ProductFormModal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Mover o `ProductFormModal` do `ProductsPageNew.tsx` para o arquivo novo, adicionar prop `flatProducts` e estado interno `currentId`, com botões:
```tsx
// dentro do modal, ao redor do conteúdo:
const idx = flatProducts.findIndex((p) => p.id === currentId);
const goto = (d: number) => { const n = flatProducts[idx + d]; if (n) setCurrentId(n.id); };
// ...
<button aria-label="produto anterior" disabled={idx <= 0} onClick={() => goto(-1)}>‹</button>
<button aria-label="próximo produto" disabled={idx >= flatProducts.length - 1} onClick={() => goto(1)}>›</button>
```
Carregar o form a partir do produto de `currentId`. Manter `onSaved` chamando o reload do container.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/products/ProductFormModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/products/ProductFormModal.tsx src/pages/products/ProductFormModal.test.tsx
git commit -m "feat(produtos): extrai ProductFormModal + galeria + setas prev/next"
```

---

## Task 13: Cutover e remoção do god file

**Files:**
- Modify: `src/pages/products/index.ts` (garantir export de `ProductsPage`)
- Modify: rota/uso (procurar quem importa `ProductsPageNew` e trocar por `ProductsPage`)
- Delete: `src/pages/products/ProductsPageNew.tsx` (após confirmar paridade)

- [ ] **Step 1: Encontrar consumidores do componente antigo**

Run: `grep -rn "ProductsPageNew\|from './ProductsPageNew'\|pages/products'" src/ --include=*.tsx --include=*.ts`
Expected: lista de imports (rota principal e `index.ts`).

- [ ] **Step 2: Trocar import da rota pra `ProductsPage`**

Editar o(s) arquivo(s) achados pra importar `ProductsPage` de `./pages/products`. Garantir que `index.ts` exporta `ProductsPage`.

- [ ] **Step 3: Rodar a suíte inteira + build**

Run: `npm test && npm run build`
Expected: testes verdes e build sem erro de TypeScript (lembrar: erro TS quebra o deploy Vercel).

- [ ] **Step 4: Remover o god file**

Run: `git rm src/pages/products/ProductsPageNew.tsx`
Confirmar que nada mais importa dele (repetir o grep do Step 1 → vazio).

- [ ] **Step 5: Rodar tudo de novo e commitar**

```bash
npm test && npm run build
git add -A
git commit -m "refactor(produtos): cutover pra ProductsPage e remove ProductsPageNew (god file)"
```

---

## Notas de verificação visual (pós-implementação)

- Rodar `npm run dev` e conferir: agrupamento por categoria, densidade da linha, `− N +` salvando, preço no blur, toggles, drag de produto/categoria, mover entre categorias, modal com imagem/galeria/setas.
- Comparar com `ftp-data/produto-page (1).png`, `produto-page2.png`, `product-modal.png`.
- Confirmar que a ordem refletiu no storefront (cardapidex-web) recarregando o cardápio público.
