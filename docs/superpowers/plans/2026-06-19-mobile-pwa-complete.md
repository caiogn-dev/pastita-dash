# PWA do Gestor — Completo e Robusto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile PWA shell complete and robust — store context working, loading/empty/error on every screen, order detail + KDS items visible, a decent create-order flow, dead-end-free navigation, and PWA install (button + first-time banner) — without changing desktop behavior.

**Architecture:** Additive code in `src/mobile/`. A global store bootstrap fixes the "select a store" dead-end; a shared orders feed (one fetch + one WebSocket) powers the live screens; a reusable BottomSheet powers the store switcher and order detail; an install hook + banner cover PWA install. Three surgical desktop edits: `App.tsx` (bootstrap), `StoreSelector.tsx` (read-only), `MainLayout.tsx` (`/inbox` fullscreen).

**Tech Stack:** Vite, React 18, TypeScript, React Router v6, Zustand (`useRootStore`, `useAuthStore`), Tailwind (semantic tokens), react-hot-toast, Jest + ts-jest + @testing-library/react.

## Global Constraints

- **Additive.** New code only under `src/mobile/`. The ONLY edits outside `src/mobile/` are: `src/App.tsx` (call store bootstrap), `src/components/layout/StoreSelector.tsx` (make read-only), `src/components/layout/MainLayout.tsx` (add `/inbox` to fullscreen regex). No other desktop behavior changes.
- **Breakpoint:** mobile = `matchMedia('(max-width: 767px)')` (already implemented in `useIsMobileViewport`).
- **Active store:** `useRootStore((s) => s.selectedStoreId)` (id string|null); list in `s.stores`.
- **Auth:** `useAuthStore((s) => s.isAuthenticated)`. NEVER `useRootStore.auth`.
- **Reuse, don't reimplement:** `getStores`, `getOrders`, `getOrder`, `updateOrderStatus` from `src/services/storesApi`; `productsService`, `ordersService` from `src/services`; `useRealTimeOrders`; `usePushNotifications`; `formatCurrency`/`formatRelativeTime` from `src/utils/formatters`; `toast` (default import) from `react-hot-toast`.
- **Semantic Tailwind tokens only** (`bg-bg-card`, `text-fg-primary/secondary/muted`, `border-border-primary`, `bg-brand-500`, `bg-brand-soft`, `text-brand-500`). No raw hex. `text-white` is allowed (utility, not hex).
- **Touch targets ≥44px.** Respect `env(safe-area-inset-bottom)` / `inset-top`.
- **import.meta.env** is handled for `src/mobile/` by `jestViteEnvTransform.cjs` (scoped). Do NOT touch jest config. Mobile tests that mock services avoid it.
- **No regression:** full suite (`npx jest`) must show ONLY `ComboForm.test.tsx` failing (14 tests, pre-existing). `npx tsc --noEmit` clean.
- Branch `feat/mobile-pwa-complete`. Do NOT push to `main`. Run `npx jest src/mobile` per task; full `npx jest` + `npx tsc --noEmit` before finishing each phase.

---

## Reference: exact shapes (verified)

```ts
// src/services/storesApi.ts
interface StoreOrderItem { id; product_name: string; variant_name: string; sku; unit_price: number; quantity: number; subtotal: number; options; notes: string; created_at; }
interface StoreOrder { id: string; order_number: string; customer_name: string; customer_phone: string; status: string; status_display: string; subtotal: number; discount: number; tax: number; delivery_fee: number; total: number; payment_method: string; delivery_method: 'delivery'|'pickup'|'digital'; delivery_method_display: string; delivery_address: DeliveryAddress; delivery_notes: string; customer_notes: string; items: StoreOrderItem[]; created_at: string; /* no items_count → use items.length */ }
interface Store { id: string; name: string; slug: string; /* + many */ }
getStores(): Promise<PaginatedResponse<Store>>              // {results: Store[]}
getOrders(params?: { store?; status?; page_size?; ... }): Promise<PaginatedResponse<StoreOrder>>
getOrder(id: string): Promise<StoreOrder>
updateOrderStatus(id, status, notify=true): Promise<{order_number; status; status_display}>

// src/stores/rootStore.ts — useRootStore
stores: Store[]; setStores(stores): void;
selectedStoreId: string|null; setSelectedStore(id|null): void;
orders: {[storeId]: StoreOrder[]}; setOrders(storeId, orders): void;

// src/utils/formatters.ts
formatCurrency(value: number): string            // "R$ 1.234,56"
formatRelativeTime(date: string|Date): string    // "há 3 minutos"

// react-hot-toast — import toast from 'react-hot-toast'; toast.error('...')
```

**Terminal statuses** (excluded from the live orders screen): `delivered`, `completed`, `cancelled`, `refunded`, `failed`.

---

# PHASE 1 — Store context

### Task 1: `useBootstrapStores` + wire into App.tsx

**Files:**
- Create: `src/mobile/useBootstrapStores.ts`
- Test: `src/mobile/__tests__/useBootstrapStores.test.ts`
- Modify: `src/App.tsx` (call the hook inside `AppContent`)

**Interfaces:**
- Produces: `useBootstrapStores(): void` — when authenticated and `useRootStore.stores` is empty, fetches `getStores()` once and calls `setStores(results)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/mobile/__tests__/useBootstrapStores.test.ts
import { renderHook, waitFor } from '@testing-library/react';

const getStores = jest.fn();
jest.mock('../../services/storesApi', () => ({ getStores: (...a: unknown[]) => getStores(...a) }));

let authed = true;
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel: (s: { isAuthenticated: boolean }) => unknown) => sel({ isAuthenticated: authed }),
}));

import { useRootStore } from '../../stores/rootStore';
import { useBootstrapStores } from '../useBootstrapStores';

beforeEach(() => {
  getStores.mockResolvedValue({ results: [{ id: 's1', name: 'Loja 1', slug: 'loja-1' }] });
  useRootStore.setState({ stores: [], selectedStoreId: null } as never);
  authed = true;
});

test('fetches stores and sets them when authenticated and stores empty', async () => {
  renderHook(() => useBootstrapStores());
  await waitFor(() => expect(getStores).toHaveBeenCalled());
  await waitFor(() => expect(useRootStore.getState().stores).toHaveLength(1));
  // setStores auto-selects stores[0]
  expect(useRootStore.getState().selectedStoreId).toBe('s1');
});

test('does not fetch when stores already loaded', async () => {
  useRootStore.setState({ stores: [{ id: 's1', name: 'L', slug: 'l' }] } as never);
  renderHook(() => useBootstrapStores());
  await Promise.resolve();
  expect(getStores).not.toHaveBeenCalled();
});

test('does not fetch when not authenticated', async () => {
  authed = false;
  renderHook(() => useBootstrapStores());
  await Promise.resolve();
  expect(getStores).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/useBootstrapStores.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/mobile/useBootstrapStores.ts
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useRootStore } from '../stores/rootStore';
import { getStores } from '../services/storesApi';

/**
 * Loads the user's stores into the global store once after auth, regardless of
 * which layout (desktop/mobile) is active. rootStore.setStores auto-selects the
 * first store when none is selected, which unblocks the mobile screens.
 */
export function useBootstrapStores(): void {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthed || fetchedRef.current) return;
    if (useRootStore.getState().stores.length > 0) return;
    fetchedRef.current = true;
    getStores()
      .then((res) => useRootStore.getState().setStores(res.results || []))
      .catch(() => { fetchedRef.current = false; });
  }, [isAuthed]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/useBootstrapStores.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into App.tsx**

In `src/App.tsx`, add the import near the other imports:
```ts
import { useBootstrapStores } from './mobile/useBootstrapStores';
```
Inside the `AppContent` component body (where `const { isAuthenticated, token } = useAuthStore();` is), add one line after the existing hooks, before the `useEffect`:
```ts
  useBootstrapStores();
```
Do not change anything else in `App.tsx`.

- [ ] **Step 6: Verify types + no regression**

Run: `npx tsc --noEmit`  → clean.
Run: `npx jest` → only `ComboForm.test.tsx` fails.

- [ ] **Step 7: Commit**

```bash
git add src/mobile/useBootstrapStores.ts src/mobile/__tests__/useBootstrapStores.test.ts src/App.tsx
git commit -m "feat(mobile): carga global de lojas no login (corrige 'selecione uma loja')"
```

---

### Task 2: `StoreSelector` read-only (SSOT)

**Files:**
- Modify: `src/components/layout/StoreSelector.tsx`
- Test: `src/components/layout/__tests__/StoreSelector.test.tsx`

**Interfaces:**
- Consumes: `useRootStore` `stores`, `selectedStoreId`, `setSelectedStore`.
- Produces: `<StoreSelector/>` renders a `<select>` from `stores` (no fetch); changing it calls `setSelectedStore`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/StoreSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

const getStores = jest.fn();
jest.mock('../../../services/storesApi', () => ({ getStores: (...a: unknown[]) => getStores(...a) }));

import { useRootStore } from '../../../stores/rootStore';
import { StoreSelector } from '../StoreSelector';

beforeEach(() => {
  getStores.mockResolvedValue({ results: [] });
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
});

test('renders options from the store WITHOUT fetching', () => {
  render(<StoreSelector />);
  expect(screen.getByRole('option', { name: 'Loja 1' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Loja 2' })).toBeInTheDocument();
  expect(getStores).not.toHaveBeenCalled();
});

test('changing the select updates the selected store', () => {
  render(<StoreSelector />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 's2' } });
  expect(useRootStore.getState().selectedStoreId).toBe('s2');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/layout/__tests__/StoreSelector.test.tsx`
Expected: FAIL — current StoreSelector fetches (getStores called) and/or markup differs.

- [ ] **Step 3: Rewrite StoreSelector read-only**

Replace the ENTIRE contents of `src/components/layout/StoreSelector.tsx` with:

```tsx
import React from 'react';
import { useRootStore } from '../../stores/rootStore';

/**
 * Read-only store picker. Stores are loaded globally by useBootstrapStores;
 * this component only displays them and updates the selection.
 */
export const StoreSelector: React.FC = () => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  if (stores.length === 0) return null;

  return (
    <select
      aria-label="Loja"
      value={selectedStoreId || ''}
      onChange={(e) => setSelectedStore(e.target.value || null)}
      className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-sm text-fg-primary"
    >
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );
};

export default StoreSelector;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/layout/__tests__/StoreSelector.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify the desktop Navbar still imports it the same way**

Run: `grep -n "StoreSelector" src/components/layout/Navbar.tsx`
Expected: the existing `<StoreSelector />` usage is unchanged and still compiles. Run `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/StoreSelector.tsx src/components/layout/__tests__/StoreSelector.test.tsx
git commit -m "refactor(stores): StoreSelector read-only (carga centralizada em useBootstrapStores)"
```

---

### Task 3: `ui/BottomSheet` reusable base

**Files:**
- Create: `src/mobile/ui/BottomSheet.tsx`
- Test: `src/mobile/__tests__/BottomSheet.test.tsx`

**Interfaces:**
- Produces: `<BottomSheet open: boolean; onClose: () => void; title?: string; children>` — fixed overlay + bottom panel; backdrop click and a close button call `onClose`; renders nothing when `!open`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/BottomSheet.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from '../ui/BottomSheet';

test('renders nothing when closed', () => {
  const { container } = render(<BottomSheet open={false} onClose={() => {}}><div>x</div></BottomSheet>);
  expect(container).toBeEmptyDOMElement();
});

test('renders content and title when open', () => {
  render(<BottomSheet open onClose={() => {}} title="Trocar loja"><div>conteudo</div></BottomSheet>);
  expect(screen.getByText('Trocar loja')).toBeInTheDocument();
  expect(screen.getByText('conteudo')).toBeInTheDocument();
});

test('calls onClose on backdrop click and close button', () => {
  const onClose = jest.fn();
  render(<BottomSheet open onClose={onClose} title="T"><div>c</div></BottomSheet>);
  fireEvent.click(screen.getByTestId('bottomsheet-backdrop'));
  fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
  expect(onClose).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/BottomSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/ui/BottomSheet.tsx
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div
        data-testid="bottomsheet-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative max-h-[85vh] overflow-auto rounded-t-2xl bg-bg-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-2">
            <XMarkIcon className="h-5 w-5 text-fg-muted" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/BottomSheet.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/ui/BottomSheet.tsx src/mobile/__tests__/BottomSheet.test.tsx
git commit -m "feat(mobile): BottomSheet reutilizavel (base de switcher e detalhe)"
```

---

### Task 4: `MobileStoreSwitcher`

**Files:**
- Create: `src/mobile/MobileStoreSwitcher.tsx`
- Test: `src/mobile/__tests__/MobileStoreSwitcher.test.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `useRootStore` (`stores`, `selectedStoreId`, `setSelectedStore`).
- Produces: `<MobileStoreSwitcher open; onClose>` — lists `stores`, active marked; tapping a store calls `setSelectedStore(id)` then `onClose`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileStoreSwitcher.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useRootStore } from '../../stores/rootStore';
import { MobileStoreSwitcher } from '../MobileStoreSwitcher';

beforeEach(() => {
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
});

test('lists stores and selecting one updates + closes', () => {
  const onClose = jest.fn();
  render(<MobileStoreSwitcher open onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: /loja 2/i }));
  expect(useRootStore.getState().selectedStoreId).toBe('s2');
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileStoreSwitcher.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/MobileStoreSwitcher.tsx
import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { BottomSheet } from './ui/BottomSheet';
import { useRootStore } from '../stores/rootStore';

interface Props { open: boolean; onClose: () => void; }

export const MobileStoreSwitcher: React.FC<Props> = ({ open, onClose }) => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  const pick = (id: string) => { setSelectedStore(id); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} title="Trocar de loja">
      <ul className="divide-y divide-border-primary">
        {stores.map((store) => (
          <li key={store.id}>
            <button
              type="button"
              onClick={() => pick(store.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-fg-primary active:bg-bg-secondary"
            >
              <span>{store.name}</span>
              {store.id === selectedStoreId && <CheckIcon className="h-5 w-5 text-brand-500" />}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileStoreSwitcher.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/MobileStoreSwitcher.tsx src/mobile/__tests__/MobileStoreSwitcher.test.tsx
git commit -m "feat(mobile): seletor de loja (bottom sheet)"
```

---

### Task 5: `MobileTopBar` + wire into MobileShell

**Files:**
- Create: `src/mobile/MobileTopBar.tsx`
- Modify: `src/mobile/MobileShell.tsx`
- Test: `src/mobile/__tests__/MobileTopBar.test.tsx`

**Interfaces:**
- Consumes: `MobileStoreSwitcher`, `useRootStore` (`stores`, `selectedStoreId`).
- Produces: `<MobileTopBar/>` — sticky top bar showing the active store name; if ≥2 stores, tapping opens the switcher; with 0/1 store, shows the name (or "Sem loja") with no action.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileTopBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useRootStore } from '../../stores/rootStore';
import { MobileTopBar } from '../MobileTopBar';

test('shows active store name and opens switcher when multiple stores', () => {
  useRootStore.setState({
    stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }, { id: 's2', name: 'Loja 2', slug: 'l2' }],
    selectedStoreId: 's1',
  } as never);
  render(<MobileTopBar />);
  fireEvent.click(screen.getByRole('button', { name: /loja 1/i }));
  expect(screen.getByText('Trocar de loja')).toBeInTheDocument();
});

test('single store renders name without a switch button', () => {
  useRootStore.setState({ stores: [{ id: 's1', name: 'Só Loja', slug: 'l1' }], selectedStoreId: 's1' } as never);
  render(<MobileTopBar />);
  expect(screen.getByText('Só Loja')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /só loja/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileTopBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/MobileTopBar.tsx
import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../stores/rootStore';
import { MobileStoreSwitcher } from './MobileStoreSwitcher';

export const MobileTopBar: React.FC = () => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const [open, setOpen] = useState(false);

  const active = stores.find((s) => s.id === selectedStoreId);
  const name = active?.name ?? (stores.length === 0 ? 'Sem loja' : 'Selecione');
  const canSwitch = stores.length >= 2;

  return (
    <header
      className="sticky top-0 z-40 flex items-center border-b border-border-primary bg-bg-card px-4 py-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      {canSwitch ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-base font-semibold text-fg-primary"
        >
          {name}
          <ChevronDownIcon className="h-4 w-4 text-fg-muted" />
        </button>
      ) : (
        <span className="text-base font-semibold text-fg-primary">{name}</span>
      )}
      {canSwitch && <MobileStoreSwitcher open={open} onClose={() => setOpen(false)} />}
    </header>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileTopBar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into MobileShell**

In `src/mobile/MobileShell.tsx`, add `import { MobileTopBar } from './MobileTopBar';` and render it above `<main>`. Change the wrapper so the shell is: top bar, then scrollable main, then bottom nav. Replace the JSX returned by `MobileShell` with:

```tsx
  return (
    <div className="flex min-h-screen flex-col bg-bg-secondary text-fg-primary">
      <MobileTopBar />
      <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {isHome ? renderTab(tab) : <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
```

The existing `MobileShell.test.tsx` mocks the tab screens; add `jest.mock('../MobileTopBar', () => ({ MobileTopBar: () => null }));` at the top of `MobileShell.test.tsx` so the routing test stays isolated. Run `npx jest src/mobile/__tests__/MobileShell.test.tsx` → PASS.

- [ ] **Step 6: Verify + commit**

Run: `npx jest src/mobile` → green. `npx tsc --noEmit` → clean.

```bash
git add src/mobile/MobileTopBar.tsx src/mobile/__tests__/MobileTopBar.test.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/MobileShell.test.tsx
git commit -m "feat(mobile): barra de topo com nome da loja + troca"
```

---

# PHASE 2 — Shared feed + robust screens

### Task 6: `useStoreOrdersFeed` + `MobileOrdersContext`

**Files:**
- Create: `src/mobile/useStoreOrdersFeed.ts`
- Create: `src/mobile/MobileOrdersContext.tsx`
- Modify: `src/mobile/MobileShell.tsx` (wrap content in provider)
- Test: `src/mobile/__tests__/useStoreOrdersFeed.test.tsx`

**Interfaces:**
- Produces:
  - `useStoreOrdersFeed(): { orders: StoreOrder[]; loading: boolean; error: string | null; refetch: () => void }` — single `getOrders({ store, page_size: 50 })` load + single `useRealTimeOrders`; reads orders from `rootStore.orders[storeId]`.
  - `<MobileOrdersProvider>` + `useMobileOrders()` returning the same shape.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/useStoreOrdersFeed.test.tsx
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => undefined }));
const getOrders = jest.fn();
jest.mock('../../services/storesApi', () => ({ getOrders: (...a: unknown[]) => getOrders(...a) }));

import { useRootStore } from '../../stores/rootStore';
import { useStoreOrdersFeed } from '../useStoreOrdersFeed';

const ORDER = { id: 'o1', order_number: '#1', status: 'pending', customer_name: 'Ana', total: 10, items: [], created_at: '2026-06-19T12:00:00Z' };

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  useRootStore.setState({ selectedStoreId: 's1', orders: {} } as never);
});

test('loads orders for the active store and exposes them', async () => {
  const { result } = renderHook(() => useStoreOrdersFeed());
  await waitFor(() => expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({ store: 's1', page_size: 50 })));
  await waitFor(() => expect(result.current.orders).toHaveLength(1));
  expect(result.current.loading).toBe(false);
});

test('sets error when the fetch fails', async () => {
  getOrders.mockRejectedValue(new Error('boom'));
  const { result } = renderHook(() => useStoreOrdersFeed());
  await waitFor(() => expect(result.current.error).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/useStoreOrdersFeed.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

```ts
// src/mobile/useStoreOrdersFeed.ts
import { useCallback, useEffect, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import { useRealTimeOrders } from '../hooks/useRealTimeOrders';
import { getOrders } from '../services/storesApi';
import type { StoreOrder } from '../services/storesApi';

export interface StoreOrdersFeed {
  orders: StoreOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStoreOrdersFeed(): StoreOrdersFeed {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const orders = useRootStore((s) => (storeId ? s.orders[storeId] : undefined)) ?? [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ store: storeId, page_size: 50 });
      useRootStore.getState().setOrders(storeId, res.results);
    } catch {
      setError('Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { orders, loading, error, refetch: load };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/useStoreOrdersFeed.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the context provider**

```tsx
// src/mobile/MobileOrdersContext.tsx
import React, { createContext, useContext } from 'react';
import { useStoreOrdersFeed, type StoreOrdersFeed } from './useStoreOrdersFeed';

const Ctx = createContext<StoreOrdersFeed | null>(null);

export const MobileOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const feed = useStoreOrdersFeed();
  return <Ctx.Provider value={feed}>{children}</Ctx.Provider>;
};

export function useMobileOrders(): StoreOrdersFeed {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMobileOrders must be used within MobileOrdersProvider');
  return ctx;
}
```

- [ ] **Step 6: Wrap MobileShell content in the provider**

In `src/mobile/MobileShell.tsx`, add `import { MobileOrdersProvider } from './MobileOrdersContext';` and wrap the returned tree so the provider sits inside the outer div (so the feed runs for the whole shell). Update the return to:

```tsx
  return (
    <MobileOrdersProvider>
      <div className="flex min-h-screen flex-col bg-bg-secondary text-fg-primary">
        <MobileTopBar />
        <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {isHome ? renderTab(tab) : <Outlet />}
        </main>
        <BottomNav />
      </div>
    </MobileOrdersProvider>
  );
```

`MobileShell.test.tsx` mocks the screens, so the provider runs `useStoreOrdersFeed` → which calls `getOrders`/`useRealTimeOrders`. Add to the top of `MobileShell.test.tsx`:
```tsx
jest.mock('../useStoreOrdersFeed', () => ({ useStoreOrdersFeed: () => ({ orders: [], loading: false, error: null, refetch: jest.fn() }) }));
```
Run `npx jest src/mobile/__tests__/MobileShell.test.tsx` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mobile/useStoreOrdersFeed.ts src/mobile/MobileOrdersContext.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/useStoreOrdersFeed.test.tsx src/mobile/__tests__/MobileShell.test.tsx
git commit -m "feat(mobile): feed unico de pedidos (1 fetch + 1 websocket) via contexto"
```

---

### Task 7: `ui/Skeleton`

**Files:**
- Create: `src/mobile/ui/Skeleton.tsx`
- Test: `src/mobile/__tests__/Skeleton.test.tsx`

**Interfaces:**
- Produces: `<SkeletonList count?: number>` — renders `count` (default 4) pulsing placeholder cards.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/Skeleton.test.tsx
import { render, screen } from '@testing-library/react';
import { SkeletonList } from '../ui/Skeleton';

test('renders the requested number of skeleton cards', () => {
  render(<SkeletonList count={3} />);
  expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/Skeleton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/ui/Skeleton.tsx
import React from 'react';

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-2 p-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} data-testid="skeleton-card" className="h-20 animate-pulse rounded-xl bg-bg-card" />
    ))}
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/Skeleton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/ui/Skeleton.tsx src/mobile/__tests__/Skeleton.test.tsx
git commit -m "feat(mobile): Skeleton de carregamento reutilizavel"
```

---

### Task 8: `MobileOrderDetailSheet`

**Files:**
- Create: `src/mobile/MobileOrderDetailSheet.tsx`
- Test: `src/mobile/__tests__/MobileOrderDetailSheet.test.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `formatCurrency`, `updateOrderStatus`, `nextOrderStatus`, `STATUS_LABEL`, `toast`.
- Produces: `<MobileOrderDetailSheet order: StoreOrder | null; onClose; onAdvanced?>` — shows customer, items, address, payment, total; an advance-status button (when not terminal) calls `updateOrderStatus(order.id, next.status)` and `onAdvanced()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileOrderDetailSheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { MobileOrderDetailSheet } from '../MobileOrderDetailSheet';

const ORDER = {
  id: 'o1', order_number: '#1001', status: 'pending', status_display: 'Recebido',
  customer_name: 'Ana', customer_phone: '6399', total: 42.5, payment_method: 'cash',
  delivery_method: 'pickup', delivery_method_display: 'Retirada', delivery_address: {} as never,
  customer_notes: 'sem cebola', items: [{ id: 'i1', product_name: 'X-Salada', quantity: 2, unit_price: 20, subtotal: 40, notes: '' }],
  created_at: '2026-06-19T12:00:00Z',
} as never;

beforeEach(() => { updateOrderStatus.mockResolvedValue({ order_number: '#1001', status: 'confirmed' }); });

test('shows customer, items and advances status', async () => {
  const onAdvanced = jest.fn();
  render(<MobileOrderDetailSheet order={ORDER} onClose={() => {}} onAdvanced={onAdvanced} />);
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByText(/X-Salada/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'));
  await waitFor(() => expect(onAdvanced).toHaveBeenCalled());
});

test('renders nothing when order is null', () => {
  const { container } = render(<MobileOrderDetailSheet order={null} onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileOrderDetailSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/MobileOrderDetailSheet.tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BottomSheet } from './ui/BottomSheet';
import { formatCurrency } from '../utils/formatters';
import { updateOrderStatus } from '../services/storesApi';
import { nextOrderStatus, STATUS_LABEL } from './mobileStatus';
import type { StoreOrder } from '../services/storesApi';

interface Props {
  order: StoreOrder | null;
  onClose: () => void;
  onAdvanced?: () => void;
}

export const MobileOrderDetailSheet: React.FC<Props> = ({ order, onClose, onAdvanced }) => {
  const [busy, setBusy] = useState(false);
  if (!order) return null;

  const next = nextOrderStatus(order.status);

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, next.status);
      onAdvanced?.();
      onClose();
    } catch {
      toast.error('Erro ao atualizar o pedido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title={`Pedido ${order.order_number}`}>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <div className="font-semibold text-fg-primary">{order.customer_name}</div>
          <div className="text-fg-muted">{order.customer_phone}</div>
        </div>
        <div className="text-fg-secondary">
          {order.delivery_method_display || order.delivery_method}
          <span className="ml-1 text-fg-muted">· {STATUS_LABEL[order.status] ?? order.status}</span>
        </div>
        <ul className="divide-y divide-border-primary rounded-lg border border-border-primary">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between px-3 py-2">
              <span className="text-fg-primary">{it.quantity}× {it.product_name}</span>
              <span className="text-fg-secondary">{formatCurrency(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        {order.customer_notes && (
          <div className="rounded-lg bg-bg-secondary p-2 text-fg-secondary">Obs: {order.customer_notes}</div>
        )}
        <div className="flex justify-between border-t border-border-primary pt-2 text-base font-semibold text-fg-primary">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
        {next && (
          <button
            type="button"
            disabled={busy}
            onClick={advance}
            className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {next.label}
          </button>
        )}
      </div>
    </BottomSheet>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileOrderDetailSheet.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/MobileOrderDetailSheet.tsx src/mobile/__tests__/MobileOrderDetailSheet.test.tsx
git commit -m "feat(mobile): detalhe do pedido (itens, cliente, total) em bottom sheet"
```

---

### Task 9: MobileOrdersScreen — robust rewrite

**Files:**
- Modify: `src/mobile/screens/MobileOrdersScreen.tsx`
- Modify: `src/mobile/__tests__/MobileOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `useMobileOrders()`, `statusToColumn`/`COLUMNS`, `nextOrderStatus`/`STATUS_LABEL`, `formatCurrency`, `formatRelativeTime`, `updateOrderStatus`, `MobileOrderDetailSheet`, `SkeletonList`, `PushOptInBanner`, `toast`.
- Behavior: header "Pedidos"; loading→skeleton; error→retry; empty→message; active orders only (exclude terminal); cards show number, relative time, customer, total (formatCurrency), advance button (`py-3`, catch→toast); tapping a card opens the detail sheet.

- [ ] **Step 1: Replace the test**

Replace `src/mobile/__tests__/MobileOrdersScreen.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const feed = { orders: [] as unknown[], loading: false, error: null as string | null, refetch: jest.fn() };
jest.mock('../MobileOrdersContext', () => ({ useMobileOrders: () => feed }));
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('../PushOptInBanner', () => ({ PushOptInBanner: () => null }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { MobileOrdersScreen } from '../screens/MobileOrdersScreen';

const ORDER = { id: 'o1', order_number: '#1001', status: 'pending', customer_name: 'Ana', total: 42.5, items: [{ id: 'i', product_name: 'X', quantity: 1, unit_price: 42.5, subtotal: 42.5, notes: '' }], created_at: '2026-06-19T12:00:00Z' };

beforeEach(() => {
  feed.orders = [ORDER]; feed.loading = false; feed.error = null;
  updateOrderStatus.mockResolvedValue({ order_number: '#1001', status: 'confirmed' });
});

test('renders order cards with number and customer', () => {
  render(<MobileOrdersScreen />);
  expect(screen.getByText('#1001')).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('shows skeleton while loading and empty state when no orders', () => {
  feed.orders = []; feed.loading = true;
  const { rerender } = render(<MobileOrdersScreen />);
  expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  feed.loading = false;
  rerender(<MobileOrdersScreen />);
  expect(screen.getByText(/nenhum pedido ativo/i)).toBeInTheDocument();
});

test('shows error with retry that calls refetch', () => {
  feed.orders = []; feed.error = 'boom';
  render(<MobileOrdersScreen />);
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(feed.refetch).toHaveBeenCalled();
});

test('excludes terminal orders from the live list', () => {
  feed.orders = [{ ...ORDER, id: 'o2', order_number: '#DELIV', status: 'delivered' }];
  render(<MobileOrdersScreen />);
  expect(screen.queryByText('#DELIV')).not.toBeInTheDocument();
  expect(screen.getByText(/nenhum pedido ativo/i)).toBeInTheDocument();
});

test('tapping a card opens the detail sheet', () => {
  render(<MobileOrdersScreen />);
  fireEvent.click(screen.getByText('#1001'));
  expect(screen.getByText(/Pedido #1001/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileOrdersScreen.test.tsx`
Expected: FAIL (screen still fetches its own data / no states).

- [ ] **Step 3: Rewrite the screen**

Replace the ENTIRE contents of `src/mobile/screens/MobileOrdersScreen.tsx` with:

```tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useMobileOrders } from '../MobileOrdersContext';
import { COLUMNS, statusToColumn } from '../../pages/orders/orderColumns';
import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { updateOrderStatus } from '../../services/storesApi';
import { SkeletonList } from '../ui/Skeleton';
import { PushOptInBanner } from '../PushOptInBanner';
import { MobileOrderDetailSheet } from '../MobileOrderDetailSheet';
import type { StoreOrder } from '../../services/storesApi';

const TERMINAL = new Set(['delivered', 'completed', 'cancelled', 'refunded', 'failed']);

export const MobileOrdersScreen: React.FC = () => {
  const { orders, loading, error, refetch } = useMobileOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreOrder | null>(null);

  const advance = async (order: StoreOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextOrderStatus(order.status);
    if (!next) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      refetch();
    } catch {
      toast.error('Erro ao atualizar o pedido.');
    } finally {
      setBusyId(null);
    }
  };

  const Header = () => <h1 className="px-3 pt-3 text-lg font-bold text-fg-primary">Pedidos</h1>;

  if (loading && orders.length === 0) {
    return <div><Header /><SkeletonList count={5} /></div>;
  }
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-fg-secondary">{error}</p>
        <button type="button" onClick={refetch} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
          Tentar novamente
        </button>
      </div>
    );
  }

  const active = orders.filter((o) => !TERMINAL.has(o.status));

  return (
    <div className="pb-4">
      <Header />
      <PushOptInBanner />
      {active.length === 0 ? (
        <p className="p-6 text-center text-fg-muted">Nenhum pedido ativo no momento.</p>
      ) : (
        COLUMNS.map((col) => {
          const colOrders = active.filter((o) => statusToColumn(o.status) === col.id);
          if (colOrders.length === 0) return null;
          return (
            <section key={col.id} className="px-3 pt-3">
              <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
                {col.label} <span className="text-fg-muted">({colOrders.length})</span>
              </h2>
              <ul className="space-y-2">
                {colOrders.map((order) => {
                  const next = nextOrderStatus(order.status);
                  return (
                    <li
                      key={order.id}
                      onClick={() => setDetail(order)}
                      className="rounded-xl border border-border-primary bg-bg-card p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg-primary">{order.order_number}</span>
                        <span className="text-sm text-fg-secondary">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-fg-secondary">{order.customer_name}</span>
                        <span className="text-xs text-fg-muted">{formatRelativeTime(order.created_at)}</span>
                      </div>
                      <div className="mt-1 text-xs text-fg-muted">{STATUS_LABEL[order.status] ?? order.status}</div>
                      {next && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={(e) => advance(order, e)}
                          className="mt-3 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {next.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
      <MobileOrderDetailSheet order={detail} onClose={() => setDetail(null)} onAdvanced={refetch} />
    </div>
  );
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/mobile/__tests__/MobileOrdersScreen.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/MobileOrdersScreen.tsx src/mobile/__tests__/MobileOrdersScreen.test.tsx
git commit -m "feat(mobile): tela de pedidos robusta (estados, ativos, detalhe, timestamp, R$)"
```

---

### Task 10: MobileKdsScreen — items + states

**Files:**
- Modify: `src/mobile/screens/MobileKdsScreen.tsx`
- Modify: `src/mobile/__tests__/MobileKdsScreen.test.tsx`

**Interfaces:**
- Consumes: `useMobileOrders()`, `KDS_COLUMNS`/`groupKdsOrders`, `updateOrderStatus`, `toast`, `SkeletonList`.
- Behavior: header "Cozinha"; loading→skeleton; error→retry; all-empty→"Cozinha vazia."; each card lists items (`quantity× product_name`), customer name, delivery badge, notes; skips empty columns; advance `catch`→toast.

- [ ] **Step 1: Replace the test**

Replace `src/mobile/__tests__/MobileKdsScreen.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const feed = { orders: [] as unknown[], loading: false, error: null as string | null, refetch: jest.fn() };
jest.mock('../MobileOrdersContext', () => ({ useMobileOrders: () => feed }));
const updateOrderStatus = jest.fn();
jest.mock('../../services/storesApi', () => ({ updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { MobileKdsScreen } from '../screens/MobileKdsScreen';

const ORDER = { id: 'o1', order_number: '#1001', status: 'preparing', customer_name: 'Ana', delivery_method: 'pickup', delivery_method_display: 'Retirada', customer_notes: '', items: [{ id: 'i', product_name: 'X-Salada', quantity: 2, unit_price: 1, subtotal: 2, notes: '' }], created_at: '2026-06-19T12:00:00Z', total: 2 };

beforeEach(() => { feed.orders = [ORDER]; feed.loading = false; feed.error = null; updateOrderStatus.mockResolvedValue({ status: 'ready' }); });

test('lists the items of each order (not just a count)', () => {
  render(<MobileKdsScreen />);
  expect(screen.getByText(/2× X-Salada/)).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('advances a preparing order to ready', async () => {
  render(<MobileKdsScreen />);
  fireEvent.click(screen.getByRole('button', { name: /pronto/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'ready'));
});

test('shows empty state when kitchen has no orders', () => {
  feed.orders = [];
  render(<MobileKdsScreen />);
  expect(screen.getByText(/cozinha vazia/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileKdsScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite the screen**

Replace the ENTIRE contents of `src/mobile/screens/MobileKdsScreen.tsx` with:

```tsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useMobileOrders } from '../MobileOrdersContext';
import { KDS_COLUMNS, groupKdsOrders, type KdsColumnId } from '../../pages/kds/kdsColumns';
import { updateOrderStatus } from '../../services/storesApi';
import { SkeletonList } from '../ui/Skeleton';
import type { StoreOrder } from '../../services/storesApi';

const KDS_NEXT: Partial<Record<KdsColumnId, { status: string; label: string }>> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
};

export const MobileKdsScreen: React.FC = () => {
  const { orders, loading, error, refetch } = useMobileOrders();
  const [busyId, setBusyId] = useState<string | null>(null);

  const advance = async (order: StoreOrder, columnId: KdsColumnId) => {
    const next = KDS_NEXT[columnId];
    if (!next) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      refetch();
    } catch {
      toast.error('Erro ao atualizar o pedido.');
    } finally {
      setBusyId(null);
    }
  };

  const Header = () => <h1 className="px-3 pt-3 text-lg font-bold text-fg-primary">Cozinha</h1>;

  if (loading && orders.length === 0) return <div><Header /><SkeletonList count={4} /></div>;
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="mb-3 text-fg-secondary">{error}</p>
        <button type="button" onClick={refetch} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Tentar novamente</button>
      </div>
    );
  }

  const grouped = groupKdsOrders(orders);
  const total = KDS_COLUMNS.reduce((n, c) => n + (grouped[c.id]?.length ?? 0), 0);

  return (
    <div className="pb-4">
      <Header />
      {total === 0 ? (
        <p className="p-6 text-center text-fg-muted">Cozinha vazia.</p>
      ) : (
        KDS_COLUMNS.map((col) => {
          const colOrders = grouped[col.id] ?? [];
          if (colOrders.length === 0) return null;
          const next = KDS_NEXT[col.id];
          return (
            <section key={col.id} className="px-3 pt-3">
              <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
                {col.label} <span className="text-fg-muted">({colOrders.length})</span>
              </h2>
              <ul className="space-y-2">
                {colOrders.map((order) => (
                  <li key={order.id} className="rounded-xl border border-border-primary bg-bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-fg-primary">{order.order_number}</span>
                      <span className="rounded bg-bg-secondary px-2 py-0.5 text-xs text-fg-secondary">
                        {order.delivery_method_display || order.delivery_method}
                      </span>
                    </div>
                    <div className="text-sm text-fg-secondary">{order.customer_name}</div>
                    <ul className="mt-2 space-y-0.5 text-sm text-fg-primary">
                      {order.items.map((it) => (
                        <li key={it.id}>{it.quantity}× {it.product_name}{it.notes ? ` — ${it.notes}` : ''}</li>
                      ))}
                    </ul>
                    {order.customer_notes && <div className="mt-1 text-xs text-fg-muted">Obs: {order.customer_notes}</div>}
                    {next && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => advance(order, col.id)}
                        className="mt-3 w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60"
                      >
                        {next.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/mobile/__tests__/MobileKdsScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/MobileKdsScreen.tsx src/mobile/__tests__/MobileKdsScreen.test.tsx
git commit -m "feat(mobile): KDS mostra itens, cliente, entrega e estados"
```

---

### Task 11: MobileNewOrderScreen — cart, total, selectors, states

**Files:**
- Modify: `src/mobile/screens/MobileNewOrderScreen.tsx`
- Modify: `src/mobile/__tests__/MobileNewOrderScreen.test.tsx`

**Interfaces:**
- Consumes: `useRootStore` (selectedStoreId), `ordersService.createOrder`, `productsService.getProducts`, `formatCurrency`, `toast`, `SkeletonList`.
- Behavior: name + tel (`type="tel"`); product grid with loading/empty; cart with +/−/remove; computed total; delivery (pickup/delivery) + payment (cash/pix/credit_card) selectors; submit with catch→error; success auto-dismisses in ~4s.

- [ ] **Step 1: Replace the test**

Replace `src/mobile/__tests__/MobileNewOrderScreen.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const createOrder = jest.fn();
const getProducts = jest.fn();
jest.mock('../../services', () => ({
  ordersService: { createOrder: (...a: unknown[]) => createOrder(...a) },
  productsService: { getProducts: (...a: unknown[]) => getProducts(...a) },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  createOrder.mockResolvedValue({ id: 'o9', order_number: '#1009' });
  getProducts.mockResolvedValue({ results: [{ id: 'p1', name: 'X-Salada', price: 20 }] });
  useRootStore.setState({ selectedStoreId: 's1' } as never);
});

test('adds a product, shows total, and creates a pickup/cash order', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '6399' } });
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  expect(screen.getByText(/R\$\s?20,00/)).toBeInTheDocument(); // total line
  fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }));
  await waitFor(() => expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 's1', customer_name: 'Ana', customer_phone: '6399',
    delivery_method: 'pickup', payment_method: 'cash',
    items: [{ product_id: 'p1', quantity: 1 }],
  })));
});

test('increments and removes cart items', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  fireEvent.click(screen.getByRole('button', { name: /aumentar/i }));
  expect(screen.getByText('x2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /remover/i }));
  expect(screen.queryByText(/no pedido/i)).not.toBeInTheDocument();
});

test('shows empty-products message when none returned', async () => {
  getProducts.mockResolvedValue({ results: [] });
  render(<MobileNewOrderScreen />);
  expect(await screen.findByText(/nenhum produto ativo/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite the screen**

Replace the ENTIRE contents of `src/mobile/screens/MobileNewOrderScreen.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRootStore } from '../../stores/rootStore';
import { ordersService, productsService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
import { SkeletonList } from '../ui/Skeleton';

interface ProductLite { id: string; name: string; price: number | string; }
interface LineItem { product_id: string; name: string; price: number; quantity: number; }

const DELIVERY = [ { v: 'pickup', label: 'Retirada' }, { v: 'delivery', label: 'Entrega' } ] as const;
const PAYMENT = [ { v: 'cash', label: 'Dinheiro' }, { v: 'pix', label: 'Pix' }, { v: 'credit_card', label: 'Cartão' } ] as const;

export const MobileNewOrderScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [items, setItems] = useState<LineItem[]>([]);
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup');
  const [payment, setPayment] = useState<'cash' | 'pix' | 'credit_card'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setProductsLoading(true);
    productsService.getProducts({ store: storeId, is_active: true })
      .then((res: { results: ProductLite[] }) => setProducts(res.results || []))
      .catch(() => toast.error('Não foi possível carregar os produtos.'))
      .finally(() => setProductsLoading(false));
  }, [storeId]);

  const addItem = (p: ProductLite) => {
    const price = Number(p.price);
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, name: p.name, price, quantity: 1 }];
    });
  };
  const dec = (id: string) => setItems((prev) => prev
    .map((i) => (i.product_id === id ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.product_id !== id));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submit = async () => {
    if (!storeId || !name || items.length === 0) return;
    setSubmitting(true);
    try {
      const order = await ordersService.createOrder({
        store: storeId,
        customer_name: name,
        customer_phone: phone,
        delivery_method: delivery,
        delivery_fee: 0,
        payment_method: payment,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setDone(order.order_number);
      setName(''); setPhone(''); setItems([]);
      setTimeout(() => setDone(null), 4000);
    } catch {
      toast.error('Não foi possível criar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!storeId) return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;

  return (
    <div className="space-y-4 p-3">
      <h1 className="text-lg font-bold text-fg-primary">Novo pedido</h1>
      {done && <div className="rounded-lg bg-brand-soft p-3 text-sm text-fg-primary">Pedido {done} criado!</div>}

      <div className="space-y-2">
        <label className="block text-sm text-fg-secondary" htmlFor="m-nome">Nome do cliente</label>
        <input id="m-nome" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
        <label className="block text-sm text-fg-secondary" htmlFor="m-tel">Telefone</label>
        <input id="m-tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Produtos</h2>
        {productsLoading ? <SkeletonList count={4} />
          : products.length === 0 ? <p className="text-sm text-fg-muted">Nenhum produto ativo cadastrado.</p>
          : (
            <ul className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => addItem(p)}
                    className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-left text-sm text-fg-primary active:bg-bg-secondary">
                    {p.name}
                    <span className="block text-xs text-fg-muted">{formatCurrency(Number(p.price))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">No pedido</h2>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.product_id} className="flex items-center justify-between text-sm text-fg-primary">
                <span className="flex-1">{i.name}</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Diminuir" onClick={() => dec(i.product_id)} className="h-8 w-8 rounded bg-bg-secondary">−</button>
                  <span>x{i.quantity}</span>
                  <button type="button" aria-label="Aumentar" onClick={() => addItem({ id: i.product_id, name: i.name, price: i.price })} className="h-8 w-8 rounded bg-bg-secondary">+</button>
                  <button type="button" aria-label="Remover" onClick={() => remove(i.product_id)} className="h-8 w-8 rounded text-fg-muted">×</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border-primary pt-2 font-semibold text-fg-primary">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-xs text-fg-secondary">Entrega</span>
          <div className="flex gap-1">
            {DELIVERY.map((d) => (
              <button key={d.v} type="button" onClick={() => setDelivery(d.v)}
                className={`flex-1 rounded-lg py-2 text-xs ${delivery === d.v ? 'bg-brand-500 text-white' : 'bg-bg-card text-fg-secondary border border-border-primary'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs text-fg-secondary">Pagamento</span>
          <div className="flex gap-1">
            {PAYMENT.map((p) => (
              <button key={p.v} type="button" onClick={() => setPayment(p.v)}
                className={`flex-1 rounded-lg py-2 text-xs ${payment === p.v ? 'bg-brand-500 text-white' : 'bg-bg-card text-fg-secondary border border-border-primary'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" disabled={submitting || !name || items.length === 0} onClick={submit}
        className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60">
        {submitting ? 'Enviando...' : 'Finalizar pedido'}
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/MobileNewOrderScreen.tsx src/mobile/__tests__/MobileNewOrderScreen.test.tsx
git commit -m "feat(mobile): novo pedido com carrinho, total, entrega/pagamento e estados"
```

---

# PHASE 3 — Navigation integrity

### Task 12: `MobilePageHeader` + wire for non-home routes

**Files:**
- Create: `src/mobile/MobilePageHeader.tsx`
- Modify: `src/mobile/MobileShell.tsx`
- Test: `src/mobile/__tests__/MobilePageHeader.test.tsx`

**Interfaces:**
- Produces: `<MobilePageHeader/>` — a back bar (chevron + "Voltar") that calls `navigate('/?tab=mais')`, plus a title derived from the pathname. Rendered by MobileShell above `<Outlet/>` when `!isHome`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobilePageHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
const navigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/stores/s1/customers' }),
}));
import { MobilePageHeader } from '../MobilePageHeader';

test('back button navigates to the Mais tab', () => {
  render(<MobilePageHeader />);
  fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
  expect(navigate).toHaveBeenCalledWith('/?tab=mais');
});

test('shows a title derived from the route', () => {
  render(<MobilePageHeader />);
  expect(screen.getByText('Clientes')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobilePageHeader.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/MobilePageHeader.tsx
import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';

const TITLES: { match: RegExp; title: string }[] = [
  { match: /\/customers/, title: 'Clientes' },
  { match: /\/products/, title: 'Produtos' },
  { match: /\/settings/, title: 'Configurações' },
  { match: /\/stores$/, title: 'Lojas' },
];

export const MobilePageHeader: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = TITLES.find((t) => t.match.test(pathname))?.title ?? '';

  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 border-b border-border-primary bg-bg-card px-2 py-2">
      <button type="button" aria-label="Voltar" onClick={() => navigate('/?tab=mais')}
        className="flex items-center gap-1 p-2 text-fg-primary">
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="text-base font-semibold text-fg-primary">{title}</span>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobilePageHeader.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into MobileShell**

In `src/mobile/MobileShell.tsx`, add `import { MobilePageHeader } from './MobilePageHeader';` and render it above the `<Outlet/>` only when `!isHome`. Update the `<main>` body:

```tsx
        <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {isHome ? renderTab(tab) : (<><MobilePageHeader /><Outlet /></>)}
        </main>
```

Run `npx jest src/mobile/__tests__/MobileShell.test.tsx` (it tests the `/customers` outlet case — it should still find "Clientes desktop page"; the header adds "Clientes" text too, which does not break the existing assertion). If the shell test queries become ambiguous, scope its assertion with `getByText('Clientes desktop page')` (already specific). Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/MobilePageHeader.tsx src/mobile/__tests__/MobilePageHeader.test.tsx src/mobile/MobileShell.tsx
git commit -m "feat(mobile): header com voltar nas paginas abertas via 'Mais'"
```

---

### Task 13: MobileMoreScreen polish + `/inbox` fullscreen + store guards

**Files:**
- Modify: `src/mobile/screens/MobileMoreScreen.tsx`
- Modify: `src/mobile/__tests__/MobileMoreScreen.test.tsx`
- Modify: `src/components/layout/MainLayout.tsx` (add `inbox` to fullscreen regex)

**Interfaces:**
- Behavior: store name header; items with leading icon + trailing chevron; Clientes/Produtos disabled (with "Selecione uma loja primeiro") when no store; Conversas → `/inbox`; Configurações → `/settings`.

- [ ] **Step 1: Replace the test**

Replace `src/mobile/__tests__/MobileMoreScreen.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useRootStore } from '../../stores/rootStore';
import { MobileMoreScreen } from '../screens/MobileMoreScreen';

function renderScreen() {
  return render(<MemoryRouter><MobileMoreScreen /></MemoryRouter>);
}

test('store-scoped links resolve with the selected store', () => {
  useRootStore.setState({ selectedStoreId: 's1', stores: [{ id: 's1', name: 'Loja 1', slug: 'l1' }] } as never);
  renderScreen();
  expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/stores/s1/customers');
  expect(screen.getByRole('link', { name: /produtos/i })).toHaveAttribute('href', '/stores/s1/products');
  expect(screen.getByRole('link', { name: /conversas/i })).toHaveAttribute('href', '/inbox');
  expect(screen.getByRole('link', { name: /configura/i })).toHaveAttribute('href', '/settings');
});

test('disables store-scoped items when no store is selected', () => {
  useRootStore.setState({ selectedStoreId: null, stores: [] } as never);
  renderScreen();
  expect(screen.queryByRole('link', { name: /clientes/i })).not.toBeInTheDocument();
  expect(screen.getByText(/selecione uma loja primeiro/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileMoreScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite the screen**

Replace the ENTIRE contents of `src/mobile/screens/MobileMoreScreen.tsx` with:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon, ChatBubbleLeftRightIcon, CubeIcon, Cog6ToothIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../../stores/rootStore';

export const MobileMoreScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const stores = useRootStore((s) => s.stores);
  const activeName = stores.find((s) => s.id === storeId)?.name;

  const items = [
    { key: 'customers', to: storeId ? `/stores/${storeId}/customers` : null, label: 'Clientes', Icon: UserGroupIcon },
    { key: 'inbox', to: '/inbox', label: 'Conversas', Icon: ChatBubbleLeftRightIcon },
    { key: 'products', to: storeId ? `/stores/${storeId}/products` : null, label: 'Produtos', Icon: CubeIcon },
    { key: 'settings', to: '/settings', label: 'Configurações', Icon: Cog6ToothIcon },
  ];

  return (
    <div>
      <header className="px-4 pb-2 pt-4">
        <h1 className="text-lg font-bold text-fg-primary">Mais</h1>
        {activeName && <p className="text-sm text-fg-muted">{activeName}</p>}
      </header>
      {!storeId && (
        <p className="px-4 pb-2 text-sm text-fg-muted">Selecione uma loja primeiro para acessar Clientes e Produtos.</p>
      )}
      <ul className="divide-y divide-border-primary border-y border-border-primary">
        {items.map(({ key, to, label, Icon }) => {
          const content = (
            <span className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-fg-muted" />
              <span className="flex-1">{label}</span>
              <ChevronRightIcon className="h-4 w-4 text-fg-muted" />
            </span>
          );
          if (!to) {
            return <li key={key} className="flex items-center px-4 py-4 text-fg-muted opacity-50">{content}</li>;
          }
          return (
            <li key={key}>
              <Link to={to} className="block px-4 py-4 text-fg-primary active:bg-bg-secondary">{content}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileMoreScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `/inbox` to fullscreen in MainLayout**

In `src/components/layout/MainLayout.tsx`, change the `isFullscreenRoute` line ONLY:
```ts
  const isFullscreenRoute = /^\/(whatsapp\/(inbox|chat)|conversations|inbox)/.test(location.pathname);
```
Leave everything else unchanged. This makes `/inbox` render with its own full-bleed layout instead of squeezed inside the shell. Run `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/screens/MobileMoreScreen.tsx src/mobile/__tests__/MobileMoreScreen.test.tsx src/components/layout/MainLayout.tsx
git commit -m "feat(mobile): aba Mais com icones, guarda de loja e /inbox fullscreen"
```

---

# PHASE 4 — Install + polish

### Task 14: `useInstallPrompt`

**Files:**
- Create: `src/mobile/useInstallPrompt.ts`
- Test: `src/mobile/__tests__/useInstallPrompt.test.ts`

**Interfaces:**
- Produces: `useInstallPrompt(): { canInstall: boolean; promptInstall: () => void; isIOS: boolean; isStandalone: boolean }` — captures `beforeinstallprompt`, exposes whether install is available and a trigger.

- [ ] **Step 1: Write the failing test**

```ts
// src/mobile/__tests__/useInstallPrompt.test.ts
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

function fireBIP() {
  const evt = new Event('beforeinstallprompt') as Event & { prompt?: () => void };
  evt.prompt = jest.fn();
  // @ts-expect-error test stub
  evt.preventDefault = jest.fn();
  window.dispatchEvent(evt);
  return evt;
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
  });
});

test('captures beforeinstallprompt and exposes canInstall', () => {
  const { result } = renderHook(() => useInstallPrompt());
  expect(result.current.canInstall).toBe(false);
  act(() => { fireBIP(); });
  expect(result.current.canInstall).toBe(true);
});

test('promptInstall triggers the saved event prompt', () => {
  const { result } = renderHook(() => useInstallPrompt());
  let evt: { prompt?: () => void };
  act(() => { evt = fireBIP(); });
  act(() => { result.current.promptInstall(); });
  expect(evt!.prompt).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/useInstallPrompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/mobile/useInstallPrompt.ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export interface InstallPrompt {
  canInstall: boolean;
  promptInstall: () => void;
  isIOS: boolean;
  isStandalone: boolean;
}

export function useInstallPrompt(): InstallPrompt {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred.current) return;
    deferred.current.prompt();
    deferred.current = null;
    setCanInstall(false);
  }, []);

  return { canInstall, promptInstall, isIOS, isStandalone };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/useInstallPrompt.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/useInstallPrompt.ts src/mobile/__tests__/useInstallPrompt.test.ts
git commit -m "feat(mobile): useInstallPrompt (captura beforeinstallprompt)"
```

---

### Task 15: `InstallBanner` + "Instalar app" in Mais

**Files:**
- Create: `src/mobile/InstallBanner.tsx`
- Modify: `src/mobile/MobileShell.tsx` (render banner)
- Modify: `src/mobile/screens/MobileMoreScreen.tsx` (install entry)
- Test: `src/mobile/__tests__/InstallBanner.test.tsx`

**Interfaces:**
- Consumes: `useInstallPrompt`.
- Produces: `<InstallBanner/>` — dismissible (persisted in `localStorage('cdx_install_dismissed')`), shown when `canInstall && !isStandalone`; tapping "Instalar" calls `promptInstall`. iOS: shows the manual hint.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/InstallBanner.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

const state = { canInstall: true, promptInstall: jest.fn(), isIOS: false, isStandalone: false };
jest.mock('../useInstallPrompt', () => ({ useInstallPrompt: () => state }));

import { InstallBanner } from '../InstallBanner';

beforeEach(() => {
  state.canInstall = true; state.isStandalone = false; state.isIOS = false; state.promptInstall = jest.fn();
  localStorage.clear();
});

test('shows install CTA and triggers prompt', () => {
  render(<InstallBanner />);
  fireEvent.click(screen.getByRole('button', { name: /instalar/i }));
  expect(state.promptInstall).toHaveBeenCalled();
});

test('hides after dismiss and persists', () => {
  const { rerender } = render(<InstallBanner />);
  fireEvent.click(screen.getByRole('button', { name: /dispensar/i }));
  rerender(<InstallBanner />);
  expect(screen.queryByText(/instalar/i)).not.toBeInTheDocument();
  expect(localStorage.getItem('cdx_install_dismissed')).toBe('1');
});

test('renders nothing when already standalone', () => {
  state.isStandalone = true;
  const { container } = render(<InstallBanner />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/InstallBanner.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/InstallBanner.tsx
import React, { useState } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useInstallPrompt } from './useInstallPrompt';

const KEY = 'cdx_install_dismissed';

export const InstallBanner: React.FC = () => {
  const { canInstall, promptInstall, isIOS, isStandalone } = useInstallPrompt();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  if (isStandalone || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="m-3 flex items-center gap-3 rounded-xl border border-border-primary bg-bg-card p-3">
      <ArrowDownTrayIcon className="h-6 w-6 shrink-0 text-brand-500" />
      <div className="flex-1 text-sm text-fg-secondary">
        {isIOS
          ? 'Instale o app: toque em Compartilhar → "Adicionar à Tela de Início".'
          : 'Instale o Cardapidex na tela inicial para acesso rápido.'}
      </div>
      {!isIOS && (
        <button type="button" onClick={promptInstall}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white">Instalar</button>
      )}
      <button type="button" aria-label="Dispensar" onClick={dismiss} className="p-3">
        <XMarkIcon className="h-5 w-5 text-fg-muted" />
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/InstallBanner.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Render the banner in MobileShell + add Mais entry**

In `src/mobile/MobileShell.tsx`, add `import { InstallBanner } from './InstallBanner';` and render `<InstallBanner />` at the top of `<main>` (before the home/outlet branch):
```tsx
        <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <InstallBanner />
          {isHome ? renderTab(tab) : (<><MobilePageHeader /><Outlet /></>)}
        </main>
```
In `src/mobile/screens/MobileMoreScreen.tsx`, add an "Instalar app" button at the end of the list that calls `promptInstall` when `canInstall` (import `useInstallPrompt`). Add inside the component:
```tsx
  const { canInstall, promptInstall, isIOS, isStandalone } = useInstallPrompt();
```
and after the `</ul>`:
```tsx
      {!isStandalone && (canInstall || isIOS) && (
        <button type="button" onClick={() => { if (!isIOS) promptInstall(); }}
          className="mt-4 flex w-full items-center gap-3 px-4 py-4 text-brand-500">
          <ArrowDownTrayIcon className="h-5 w-5" />
          {isIOS ? 'Como instalar o app' : 'Instalar app'}
        </button>
      )}
```
Add the import: `import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';` and `import { useInstallPrompt } from '../useInstallPrompt';`. The existing `MobileMoreScreen.test.tsx` does not mock `useInstallPrompt`; add `jest.mock('../useInstallPrompt', () => ({ useInstallPrompt: () => ({ canInstall: false, promptInstall: jest.fn(), isIOS: false, isStandalone: false }) }));` at the top of `MobileMoreScreen.test.tsx`. Run `npx jest src/mobile/__tests__/MobileMoreScreen.test.tsx` → PASS.

- [ ] **Step 6: Verify + commit**

Run: `npx jest src/mobile` → green. `npx tsc --noEmit` → clean.

```bash
git add src/mobile/InstallBanner.tsx src/mobile/__tests__/InstallBanner.test.tsx src/mobile/MobileShell.tsx src/mobile/screens/MobileMoreScreen.tsx src/mobile/__tests__/MobileMoreScreen.test.tsx
git commit -m "feat(mobile): banner de instalacao + atalho 'Instalar app' na aba Mais"
```

---

### Task 16: PushOptInBanner polish + safe-area

**Files:**
- Modify: `src/mobile/PushOptInBanner.tsx`
- Modify: `src/mobile/__tests__/PushOptInBanner.test.tsx`

**Interfaces:**
- Behavior: dismissal persists in `localStorage('cdx_push_dismissed')`; shows `error` from the hook when present; dismiss button has `p-3` touch target.

- [ ] **Step 1: Extend the test**

Add to `src/mobile/__tests__/PushOptInBanner.test.tsx` (keep the existing tests; append):

```tsx
test('persists dismissal across remounts', () => {
  localStorage.clear();
  const { rerender, container } = render(<PushOptInBanner />);
  fireEvent.click(screen.getByRole('button', { name: /dispensar/i }));
  rerender(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
  expect(localStorage.getItem('cdx_push_dismissed')).toBe('1');
});

test('shows the hook error message when present', () => {
  mockState.error = 'falhou';
  render(<PushOptInBanner />);
  expect(screen.getByText('falhou')).toBeInTheDocument();
});
```

In the existing `beforeEach` of that file, add `mockState.error = null;` and `localStorage.clear();` so cases stay isolated.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/PushOptInBanner.test.tsx`
Expected: FAIL (no persistence / no error display).

- [ ] **Step 3: Update PushOptInBanner**

Edit `src/mobile/PushOptInBanner.tsx`:
- Change the `useState` for `dismissed` to initialize from storage:
```tsx
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('cdx_push_dismissed') === '1'; } catch { return false; }
  });
```
- Pull `error` from the hook: `const { permission, isSubscribed, isLoading, error, subscribe } = usePushNotifications();`
- Make the dismiss handler persist:
```tsx
  const dismiss = () => {
    try { localStorage.setItem('cdx_push_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  };
```
  and change the dismiss button to `onClick={dismiss}` with `className="p-3"`.
- Render the error under the text when present:
```tsx
      {error && <span className="text-xs text-danger-500">{error}</span>}
```
  (place it inside the text column.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/PushOptInBanner.test.tsx`
Expected: PASS (all).

- [ ] **Step 5: Full verification**

Run: `npx jest src/mobile` → green.
Run: `npx jest` → only `ComboForm.test.tsx` fails.
Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/PushOptInBanner.tsx src/mobile/__tests__/PushOptInBanner.test.tsx
git commit -m "feat(mobile): push opt-in persiste dismiss + mostra erro; alvo de toque"
```

---

## Self-Review

**Spec coverage:**
- F1.1 bootstrap → Task 1. F1.1 sanitize StoreSelector → Task 2. F1.2 TopBar → Task 5. F1.3 Switcher → Task 4 (+ BottomSheet Task 3). F1.4 shell topbar → Task 5. ✓
- F2.0 shared feed/1 WS → Task 6. F2.1 states/skeleton → Tasks 7,9,10,11. F2.2 order detail → Task 8 (+ wire Task 9). F2.3 orders screen → Task 9. F2.4 KDS → Task 10. F2.5 new order → Task 11. ✓
- F3.1 page header/back → Task 12. F3.2 /inbox fullscreen → Task 13. F3.3 store guards → Task 13. F3.4 Mais icons → Task 13. ✓
- F4.1 useInstallPrompt → Task 14. F4.2 Mais install entry → Task 15. F4.3 install banner → Task 15. F4.4 polish (push persist/error, safe-area pb, dismiss target) → Tasks 16 + 5/6 (pb). ✓

**Placeholder scan:** none — every code step has full code.

**Type consistency:** `useStoreOrdersFeed` shape `{orders,loading,error,refetch}` consumed identically in Tasks 9–10; `nextOrderStatus`/`STATUS_LABEL` reused from existing `mobileStatus.ts`; `updateOrderStatus(id, status)` consistent across detail/orders/KDS; `formatCurrency`/`formatRelativeTime` from `utils/formatters`; `BottomSheet` props `{open,onClose,title,children}` used by switcher (Task 4) and detail (Task 8); `useInstallPrompt` shape consistent across Tasks 14/15.

**Notes for implementers (verify against real code, not placeholders):**
- Heroicons: all icons used (`CheckIcon`, `ChevronDownIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `UserGroupIcon`, `ChatBubbleLeftRightIcon`, `CubeIcon`, `Cog6ToothIcon`, `ArrowDownTrayIcon`, `XMarkIcon`, `BellAlertIcon`) exist in `@heroicons/react/24/outline` v2. If any name differs, mirror an existing import and adjust.
- `productsService.getProducts` accepts `{ store, is_active }` (used by desktop `OrderNewPage`). `ordersService.createOrder` payload matches the existing mobile screen + `CreateOrder` type.
- `danger-500` token: if absent in tailwind config, use `text-red-500` for the push error.
