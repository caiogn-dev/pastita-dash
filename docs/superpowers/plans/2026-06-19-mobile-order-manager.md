# Camada Mobile do Gestor de Pedidos (PWA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a phone-first mobile shell (bottom-nav app experience) to the Cardapidex manager dashboard for the three core flows — live orders + status, create order + customer, and KDS — without touching any desktop code.

**Architecture:** A viewport-gated `<MobileShell/>` mounts in `MainLayout` only when the viewport is `< 768px` and the user is authenticated. The shell renders its own bottom-nav tabs (tab stored in the URL `?tab=` search param) for the three core screens, falls back to `<Outlet/>` for any secondary route, and reuses 100% of existing services/hooks/stores. New code lives entirely under `src/mobile/`. The desktop render path in `MainLayout` is unchanged.

**Tech Stack:** Vite, React 18, TypeScript, React Router, Zustand (`useRootStore`), Tailwind (semantic tokens), Jest + ts-jest + @testing-library/react.

## Global Constraints

- **Desktop untouched:** the only allowed edit to a non-`src/mobile/` file is adding the mobile branch in `src/components/layout/MainLayout.tsx`. No other existing component, page, or style may change.
- **Breakpoint:** mobile = `matchMedia('(max-width: 767px)')`. Phone only; tablets are out of scope.
- **Active store:** always `useRootStore((s) => s.selectedStoreId)` (a store **id** string or null). Never read a route param for the store in mobile code.
- **No new data logic:** mobile screens are presentation only. Reuse `getOrders`, `updateOrderStatus`/`ordersService`, `crmApi`, `useRealTimeOrders`, `usePushNotifications`, `useRootStore`.
- **Theme tokens only:** use semantic Tailwind tokens (`bg-bg-secondary`, `bg-bg-card`, `text-fg-primary`, `text-fg-secondary`, `text-fg-muted`, `border-border-primary`, `bg-brand-500/600`). No raw hex.
- **Safe area:** the bottom nav must respect `env(safe-area-inset-bottom)` for iOS.
- **Branch:** work on `feat/mobile-order-manager` (already created). Do NOT push to `main` (Vercel auto-deploys). `npx tsc --noEmit` must be green before any merge.

---

## File Structure

```
src/mobile/
  useIsMobileViewport.ts        # viewport gate hook
  MobileShell.tsx               # shell: tab routing + Outlet fallback + BottomNav
  BottomNav.tsx                 # fixed bottom tab bar (4 tabs)
  mobileStatus.ts               # nextOrderStatus() helper + shared status labels
  PushOptInBanner.tsx           # dismissible push opt-in banner (Pedidos screen)
  screens/
    MobileOrdersScreen.tsx      # live orders as cards, grouped by status, advance status
    MobileKdsScreen.tsx         # kitchen queue, advance status
    MobileNewOrderScreen.tsx    # customer search/create + items + create order
    MobileMoreScreen.tsx        # links to secondary sections
  __tests__/
    useIsMobileViewport.test.ts
    BottomNav.test.tsx
    MobileShell.test.tsx
    MobileOrdersScreen.test.tsx
    MobileKdsScreen.test.tsx
    MobileNewOrderScreen.test.tsx
```

Modified (one branch only): `src/components/layout/MainLayout.tsx`.

---

### Reference: exact existing symbols to reuse

Copy import styles from the source files verbatim. Confirmed signatures:

- `useRealTimeOrders(config: { enabled?: boolean; apiUrl: string; wsUrl: string })` — `src/hooks/useRealTimeOrders.ts`. Side-effect only (populates the store via WS). Returns `{ isConnected, reconnect, refreshOrders }`.
- Orders store slice — `useRootStore((s) => s.orders[storeId])` returns `StoreOrder[] | undefined`; write via `useRootStore.getState().setOrders(storeId, list)`.
- `getOrders({ store: storeId })` → `Promise<{ results: Order[] }>` (named import from `src/services/orders.ts`, as used in `src/pages/kds/KdsPage.tsx:41`).
- `updateOrderStatus(orderId, status)` (named import from `src/services/orders.ts`, as used in `KdsPage.tsx`) **or** `ordersService.updateStatus(id, status, storeSlug?)`. Use `updateOrderStatus(orderId, status)` to mirror KDS.
- `ordersService.createOrder(data: CreateOrder): Promise<Order>` — `src/services/orders.ts:66`.
- `crmApi.searchCustomers(storeSlug, q, limit?)` → `api.get<CustomerSearchResult[]>` — `src/services/crmApi.ts`.
- `usePushNotifications(): { permission, isSubscribed, isLoading, error, subscribe, unsubscribe }` — `src/hooks/usePushNotifications.ts`.
- `COLUMNS`, `statusToColumn(status): ColumnId`, `type ColumnId` — `src/pages/orders/orderColumns.ts`. `ColumnId ∈ 'pending'|'confirmed'|'preparing'|'dispatch'|'done'`.
- `KDS_COLUMNS`, `groupKdsOrders(orders)`, `type KdsColumnId` — `src/pages/kds/kdsColumns.ts`. `KdsColumnId ∈ 'todo'|'preparing'|'ready'`.
- `Order` type — `src/types/index.ts`. Display fields: `id, order_number, customer_name, total, items, status, created_at`. `status` enum includes `pending|confirmed|preparing|ready|out_for_delivery|delivered|cancelled|...`.
- `CreateOrder` type — `src/types/index.ts` (see Task 7 for the exact payload).
- Auth gate — `useRootStore((s) => s.auth.token)` (truthy = authenticated).
- Env — `import.meta.env.VITE_API_URL`, `import.meta.env.VITE_WS_URL`.

### Reference: Jest setup

`jest.config.cjs`: ts-jest, jsdom, `setupFilesAfterEach` → `src/setupTests.ts` (only imports `@testing-library/jest-dom`). `testMatch: **/__tests__/**/*.test.ts?(x)`. **`matchMedia` is NOT pre-mocked** — each test that needs it mocks it locally. Service mocking pattern (`jest.mock('../../services/...')`) as in `src/__tests__/notifications.service.test.ts`.

---

### Task 1: `useIsMobileViewport` hook

**Files:**
- Create: `src/mobile/useIsMobileViewport.ts`
- Test: `src/mobile/__tests__/useIsMobileViewport.test.ts`

**Interfaces:**
- Produces: `useIsMobileViewport(): boolean` — `true` when `matchMedia('(max-width: 767px)').matches`, reactive to changes.

- [ ] **Step 1: Write the failing test**

```typescript
// src/mobile/__tests__/useIsMobileViewport.test.ts
import { renderHook, act } from '@testing-library/react';
import { useIsMobileViewport } from '../useIsMobileViewport';

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: initialMatches,
    media: '(max-width: 767px)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue(mql),
  });
  return {
    emit: (matches: boolean) => {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

test('returns true when viewport is below the mobile breakpoint', () => {
  mockMatchMedia(true);
  const { result } = renderHook(() => useIsMobileViewport());
  expect(result.current).toBe(true);
});

test('reacts to viewport changes', () => {
  const ctrl = mockMatchMedia(false);
  const { result } = renderHook(() => useIsMobileViewport());
  expect(result.current).toBe(false);
  act(() => ctrl.emit(true));
  expect(result.current).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/useIsMobileViewport.test.ts`
Expected: FAIL — "Cannot find module '../useIsMobileViewport'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/mobile/useIsMobileViewport.ts
import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

/** True when the viewport is a phone-sized screen. Reactive to resize/orientation. */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/useIsMobileViewport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/useIsMobileViewport.ts src/mobile/__tests__/useIsMobileViewport.test.ts
git commit -m "feat(mobile): hook useIsMobileViewport (gate por viewport)"
```

---

### Task 2: `mobileStatus` helper

**Files:**
- Create: `src/mobile/mobileStatus.ts`
- Test: `src/mobile/__tests__/mobileStatus.test.ts`

**Interfaces:**
- Produces:
  - `nextOrderStatus(status: string): { status: string; label: string } | null` — the next forward transition for the live-orders board, or `null` if terminal.
  - `STATUS_LABEL: Record<string, string>` — pt-BR label per status.

- [ ] **Step 1: Write the failing test**

```typescript
// src/mobile/__tests__/mobileStatus.test.ts
import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';

test('advances pending -> confirmed', () => {
  expect(nextOrderStatus('pending')).toEqual({ status: 'confirmed', label: 'Confirmar' });
});

test('advances preparing -> ready', () => {
  expect(nextOrderStatus('preparing')).toEqual({ status: 'ready', label: 'Marcar pronto' });
});

test('returns null for a terminal status', () => {
  expect(nextOrderStatus('delivered')).toBeNull();
  expect(nextOrderStatus('cancelled')).toBeNull();
});

test('has a pt-BR label for known statuses', () => {
  expect(STATUS_LABEL.preparing).toBe('Em preparo');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/mobileStatus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/mobile/mobileStatus.ts

/** pt-BR labels for order statuses shown on mobile. */
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Forward transition chain for the live-orders board. The label is the CTA text.
const NEXT: Record<string, { status: string; label: string }> = {
  pending: { status: 'confirmed', label: 'Confirmar' },
  confirmed: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
  ready: { status: 'out_for_delivery', label: 'Saiu p/ entrega' },
  out_for_delivery: { status: 'delivered', label: 'Entregue' },
};

/** Next forward transition for an order, or null when terminal. */
export function nextOrderStatus(status: string): { status: string; label: string } | null {
  return NEXT[status] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/mobileStatus.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/mobileStatus.ts src/mobile/__tests__/mobileStatus.test.ts
git commit -m "feat(mobile): helper nextOrderStatus + labels pt-BR"
```

---

### Task 3: `BottomNav` component

**Files:**
- Create: `src/mobile/BottomNav.tsx`
- Test: `src/mobile/__tests__/BottomNav.test.tsx`

**Interfaces:**
- Consumes: React Router (`useSearchParams`, `useLocation`, `useNavigate`).
- Produces: `<BottomNav/>` — fixed bar with 4 tabs. Tabs Pedidos/Novo/Cozinha set `/?tab=pedidos|novo|cozinha`; Mais navigates to `/?tab=mais`. Active tab derives from `tab` search param (default `pedidos`) when at `/`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/BottomNav.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../BottomNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

test('renders the four tabs', () => {
  renderAt('/?tab=pedidos');
  expect(screen.getByRole('button', { name: /pedidos/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /novo/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cozinha/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mais/i })).toBeInTheDocument();
});

test('marks the active tab from the search param', () => {
  renderAt('/?tab=cozinha');
  expect(screen.getByRole('button', { name: /cozinha/i })).toHaveAttribute('aria-current', 'page');
});

test('defaults active tab to pedidos at root with no param', () => {
  renderAt('/');
  expect(screen.getByRole('button', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/BottomNav.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/BottomNav.tsx
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  FireIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

type TabKey = 'pedidos' | 'novo' | 'cozinha' | 'mais';

const TABS: { key: TabKey; label: string; Icon: typeof FireIcon }[] = [
  { key: 'pedidos', label: 'Pedidos', Icon: ClipboardDocumentListIcon },
  { key: 'novo', label: 'Novo', Icon: PlusCircleIcon },
  { key: 'cozinha', label: 'Cozinha', Icon: FireIcon },
  { key: 'mais', label: 'Mais', Icon: EllipsisHorizontalIcon },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const active: TabKey =
    location.pathname === '/' ? ((params.get('tab') as TabKey) || 'pedidos') : 'mais';

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-bg-card border-t border-border-primary flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => navigate(`/?tab=${key}`)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-brand-500' : 'text-fg-muted'
            }`}
          >
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
```

> Note: confirm `@heroicons/react` is a dependency (it is used across the dashboard, e.g. `orderColumns.ts` imports `ClockIcon`). If the import path differs in this repo, mirror the path used in `src/pages/orders/orderColumns.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/BottomNav.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/BottomNav.tsx src/mobile/__tests__/BottomNav.test.tsx
git commit -m "feat(mobile): BottomNav com 4 abas e estado por search param"
```

---

### Task 4: `MobileShell` + `MainLayout` wiring (placeholder screens)

**Files:**
- Create: `src/mobile/MobileShell.tsx`
- Modify: `src/components/layout/MainLayout.tsx` (add mobile branch only)
- Test: `src/mobile/__tests__/MobileShell.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams`, `useLocation`, `<Outlet/>`, `BottomNav`.
- Produces: `<MobileShell/>` — at `/` renders the active tab screen (by `?tab=`); on any other path renders `<Outlet/>`. Always renders `<BottomNav/>` and reserves bottom padding for it. This task uses inline placeholder screens; Tasks 6–9 replace them.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileShell.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MobileShell } from '../MobileShell';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MobileShell />}>
          <Route path="/customers" element={<div>Clientes desktop page</div>} />
          <Route path="/" element={<div>should-not-render-on-mobile-home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('renders the Pedidos screen at root by default', () => {
  renderAt('/');
  expect(screen.getByTestId('mobile-screen-pedidos')).toBeInTheDocument();
});

test('renders the Cozinha screen when tab=cozinha', () => {
  renderAt('/?tab=cozinha');
  expect(screen.getByTestId('mobile-screen-cozinha')).toBeInTheDocument();
});

test('renders the outlet (desktop page) on a secondary route', () => {
  renderAt('/customers');
  expect(screen.getByText('Clientes desktop page')).toBeInTheDocument();
});

test('always renders the bottom nav', () => {
  renderAt('/');
  expect(screen.getByRole('button', { name: /pedidos/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileShell.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation (placeholder screens inline)**

```tsx
// src/mobile/MobileShell.tsx
import React from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNav } from './BottomNav';

type TabKey = 'pedidos' | 'novo' | 'cozinha' | 'mais';

// Placeholder screens — replaced by real screens in later tasks.
const Placeholder: React.FC<{ tab: TabKey }> = ({ tab }) => (
  <div data-testid={`mobile-screen-${tab}`} className="p-4 text-fg-primary">
    {tab}
  </div>
);

export const MobileShell: React.FC = () => {
  const location = useLocation();
  const [params] = useSearchParams();
  const isHome = location.pathname === '/';
  const tab = (params.get('tab') as TabKey) || 'pedidos';

  return (
    <div className="min-h-screen bg-bg-secondary text-fg-primary flex flex-col">
      <main className="flex-1 overflow-auto pb-20">
        {isHome ? <Placeholder tab={tab} /> : <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
};

export default MobileShell;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileShell.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the mobile branch into `MainLayout`**

Edit `src/components/layout/MainLayout.tsx`. Add imports at the top:

```typescript
import { useIsMobileViewport } from '../../mobile/useIsMobileViewport';
import { MobileShell } from '../../mobile/MobileShell';
import { useRootStore } from '../../stores/rootStore';
```

Inside the component, after the existing `const isFullscreenRoute = ...` line and BEFORE the `if (isDedicatedOrderRoute)` block, add:

```typescript
  const isMobile = useIsMobileViewport();
  const isAuthed = useRootStore((s) => Boolean(s.auth.token));

  // Phone-sized + authenticated: render the mobile shell instead of the desktop
  // chrome. Fullscreen routes (inbox/chat) keep their own full-bleed layout.
  if (isMobile && isAuthed && !isFullscreenRoute) {
    return <MobileShell />;
  }
```

Leave every other line of `MainLayout.tsx` exactly as-is.

- [ ] **Step 6: Verify types and desktop is untouched**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `git diff --stat src/components/layout/MainLayout.tsx`
Expected: only additions (the import lines + the mobile branch); no removed/changed desktop lines.

- [ ] **Step 7: Commit**

```bash
git add src/mobile/MobileShell.tsx src/mobile/__tests__/MobileShell.test.tsx src/components/layout/MainLayout.tsx
git commit -m "feat(mobile): MobileShell + bifurcacao por viewport no MainLayout"
```

---

### Task 5: `PushOptInBanner` component

**Files:**
- Create: `src/mobile/PushOptInBanner.tsx`
- Test: `src/mobile/__tests__/PushOptInBanner.test.tsx`

**Interfaces:**
- Consumes: `usePushNotifications()` → `{ permission, isSubscribed, isLoading, subscribe }`.
- Produces: `<PushOptInBanner/>` — renders nothing if already subscribed, unsupported, or permission denied; otherwise a dismissible banner with an "Ativar notificações" button that calls `subscribe()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/PushOptInBanner.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PushOptInBanner } from '../PushOptInBanner';

const mockState = {
  permission: 'default' as string,
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

jest.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockState,
}));

beforeEach(() => {
  mockState.permission = 'default';
  mockState.isSubscribed = false;
  mockState.subscribe = jest.fn();
});

test('shows opt-in and calls subscribe on click', () => {
  render(<PushOptInBanner />);
  fireEvent.click(screen.getByRole('button', { name: /ativar notifica/i }));
  expect(mockState.subscribe).toHaveBeenCalled();
});

test('renders nothing when already subscribed', () => {
  mockState.isSubscribed = true;
  const { container } = render(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing when permission is denied', () => {
  mockState.permission = 'denied';
  const { container } = render(<PushOptInBanner />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/PushOptInBanner.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/PushOptInBanner.tsx
import React, { useState } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const PushOptInBanner: React.FC = () => {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (isSubscribed || dismissed) return null;
  if (permission === 'denied' || permission === 'unsupported') return null;

  return (
    <div className="m-3 flex items-center gap-3 rounded-xl bg-bg-card border border-border-primary p-3">
      <BellAlertIcon className="h-6 w-6 text-brand-500 shrink-0" />
      <div className="flex-1 text-sm text-fg-secondary">
        Ative as notificações para saber na hora quando entrar um pedido.
      </div>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => subscribe()}
        className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isLoading ? '...' : 'Ativar notificações'}
      </button>
      <button type="button" aria-label="Dispensar" onClick={() => setDismissed(true)}>
        <XMarkIcon className="h-5 w-5 text-fg-muted" />
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/PushOptInBanner.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/PushOptInBanner.tsx src/mobile/__tests__/PushOptInBanner.test.tsx
git commit -m "feat(mobile): banner de opt-in de push notifications"
```

---

### Task 6: `MobileOrdersScreen` (live orders + advance status)

**Files:**
- Create: `src/mobile/screens/MobileOrdersScreen.tsx`
- Modify: `src/mobile/MobileShell.tsx` (swap the `pedidos` placeholder for the real screen)
- Test: `src/mobile/__tests__/MobileOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `useRootStore` (`selectedStoreId`, `orders`, `setOrders`), `useRealTimeOrders`, `getOrders`, `updateOrderStatus`, `statusToColumn`, `COLUMNS`, `nextOrderStatus`, `STATUS_LABEL`, `PushOptInBanner`.
- Produces: `<MobileOrdersScreen/>` — live list of the active store's orders as cards grouped by column (using `statusToColumn`), each with order number, customer, total, and an advance-status button.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileOrdersScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => ({ isConnected: true }) }));
jest.mock('../PushOptInBanner', () => ({ PushOptInBanner: () => null }));

const getOrders = jest.fn();
const updateOrderStatus = jest.fn();
jest.mock('../../services/orders', () => ({
  getOrders: (...a: unknown[]) => getOrders(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}));

import { useRootStore } from '../../stores/rootStore';
import { MobileOrdersScreen } from '../screens/MobileOrdersScreen';

const ORDER = {
  id: 'o1', order_number: '#1001', customer_name: 'Ana', total: 42.5,
  status: 'pending', items: [], created_at: '2026-06-19T12:00:00Z',
};

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  updateOrderStatus.mockResolvedValue({ ...ORDER, status: 'confirmed' });
  useRootStore.setState({ selectedStoreId: 's1', orders: { s1: [ORDER] } } as never);
});

function renderScreen() {
  return render(<MemoryRouter><MobileOrdersScreen /></MemoryRouter>);
}

test('renders an order card for the active store', async () => {
  renderScreen();
  expect(await screen.findByText('#1001')).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});

test('advances status when the CTA is tapped', async () => {
  renderScreen();
  fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileOrdersScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/screens/MobileOrdersScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { getOrders, updateOrderStatus } from '../../services/orders';
import { COLUMNS, statusToColumn } from '../../pages/orders/orderColumns';
import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';
import { PushOptInBanner } from '../PushOptInBanner';
import type { Order } from '../../types';

export const MobileOrdersScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const orders = useRootStore((s) => (storeId ? s.orders[storeId] : undefined)) ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  useEffect(() => {
    if (!storeId) return;
    getOrders({ store: storeId }).then((res) => {
      useRootStore.getState().setOrders(storeId, res.results);
    });
  }, [storeId]);

  const advance = async (order: Order) => {
    const next = nextOrderStatus(order.status);
    if (!next || !storeId) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      const current = useRootStore.getState().orders[storeId] || [];
      useRootStore.getState().setOrders(
        storeId,
        current.map((o) => (o.id === order.id ? { ...o, status: next.status } : o)),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!storeId) {
    return <div className="p-4 text-fg-muted">Selecione uma loja para ver os pedidos.</div>;
  }

  return (
    <div className="pb-4">
      <PushOptInBanner />
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => statusToColumn(o.status) === col.id);
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
                  <li key={order.id} className="rounded-xl bg-bg-card border border-border-primary p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg-primary">{order.order_number}</span>
                      <span className="text-sm text-fg-secondary">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-fg-secondary">{order.customer_name}</div>
                    <div className="mt-1 text-xs text-fg-muted">{STATUS_LABEL[order.status] ?? order.status}</div>
                    {next && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => advance(order)}
                        className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white disabled:opacity-60"
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
      })}
    </div>
  );
};
```

- [ ] **Step 4: Swap the placeholder in `MobileShell`**

In `src/mobile/MobileShell.tsx`: add `import { MobileOrdersScreen } from './screens/MobileOrdersScreen';` and replace the `pedidos` branch so that when `tab === 'pedidos'` it renders `<MobileOrdersScreen />` instead of `<Placeholder tab="pedidos" />`. Keep the other placeholders for now. Wrap the screen render in a `data-testid="mobile-screen-pedidos"` container is no longer needed — update `MobileShell.test.tsx`'s first assertion to `screen.getByText(/pedidos/i)` is brittle; instead keep the placeholder testid by rendering screens via a small switch that preserves the existing Cozinha placeholder test. Concretely, structure the home render as:

```tsx
function renderTab(tab: TabKey) {
  switch (tab) {
    case 'pedidos': return <MobileOrdersScreen />;
    default: return <Placeholder tab={tab} />;
  }
}
```

and call `{isHome ? renderTab(tab) : <Outlet />}`.

> Because `MobileOrdersScreen` reads the store and `useRealTimeOrders`, update `MobileShell.test.tsx`: mock `../screens/MobileOrdersScreen` to a stub returning `<div data-testid="mobile-screen-pedidos" />` so the shell test stays a pure routing test. Add at the top of `MobileShell.test.tsx`:
> ```tsx
> jest.mock('../screens/MobileOrdersScreen', () => ({ MobileOrdersScreen: () => <div data-testid="mobile-screen-pedidos" /> }));
> ```

- [ ] **Step 5: Run tests**

Run: `npx jest src/mobile/__tests__/MobileOrdersScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add src/mobile/screens/MobileOrdersScreen.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/MobileOrdersScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx
git commit -m "feat(mobile): tela de pedidos ao vivo com avanco de status"
```

---

### Task 7: `MobileKdsScreen` (kitchen queue + advance status)

**Files:**
- Create: `src/mobile/screens/MobileKdsScreen.tsx`
- Modify: `src/mobile/MobileShell.tsx` (swap the `cozinha` placeholder)
- Test: `src/mobile/__tests__/MobileKdsScreen.test.tsx`

**Interfaces:**
- Consumes: `useRootStore`, `useRealTimeOrders`, `getOrders`, `updateOrderStatus`, `KDS_COLUMNS`, `groupKdsOrders`. KDS forward map: `todo→preparing`, `preparing→ready`.
- Produces: `<MobileKdsScreen/>` — single-column queue grouped by KDS columns, big "advance" buttons.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileKdsScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../../hooks/useRealTimeOrders', () => ({ useRealTimeOrders: () => ({ isConnected: true }) }));
const getOrders = jest.fn();
const updateOrderStatus = jest.fn();
jest.mock('../../services/orders', () => ({
  getOrders: (...a: unknown[]) => getOrders(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
}));

import { useRootStore } from '../../stores/rootStore';
import { MobileKdsScreen } from '../screens/MobileKdsScreen';

const ORDER = {
  id: 'o1', order_number: '#1001', customer_name: 'Ana', total: 10,
  status: 'preparing', items: [], created_at: '2026-06-19T12:00:00Z',
};

beforeEach(() => {
  getOrders.mockResolvedValue({ results: [ORDER] });
  updateOrderStatus.mockResolvedValue({ ...ORDER, status: 'ready' });
  useRootStore.setState({ selectedStoreId: 's1', orders: { s1: [ORDER] } } as never);
});

test('advances a preparing order to ready', async () => {
  render(<MobileKdsScreen />);
  fireEvent.click(await screen.findByRole('button', { name: /pronto/i }));
  await waitFor(() => expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'ready'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileKdsScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/screens/MobileKdsScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { getOrders, updateOrderStatus } from '../../services/orders';
import { KDS_COLUMNS, groupKdsOrders, type KdsColumnId } from '../../pages/kds/kdsColumns';
import type { Order } from '../../types';

const KDS_NEXT: Partial<Record<KdsColumnId, { status: string; label: string }>> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
};

export const MobileKdsScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const orders = useRootStore((s) => (storeId ? s.orders[storeId] : undefined)) ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  useEffect(() => {
    if (!storeId) return;
    getOrders({ store: storeId }).then((res) => {
      useRootStore.getState().setOrders(storeId, res.results);
    });
  }, [storeId]);

  const advance = async (order: Order, columnId: KdsColumnId) => {
    const next = KDS_NEXT[columnId];
    if (!next || !storeId) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      const current = useRootStore.getState().orders[storeId] || [];
      useRootStore.getState().setOrders(
        storeId,
        current.map((o) => (o.id === order.id ? { ...o, status: next.status } : o)),
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!storeId) {
    return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;
  }

  const grouped = groupKdsOrders(orders);

  return (
    <div className="pb-4">
      {KDS_COLUMNS.map((col) => {
        const colOrders = grouped[col.id] ?? [];
        const next = KDS_NEXT[col.id];
        return (
          <section key={col.id} className="px-3 pt-3">
            <h2 className="mb-2 text-sm font-semibold text-fg-secondary">
              {col.label} <span className="text-fg-muted">({colOrders.length})</span>
            </h2>
            <ul className="space-y-2">
              {colOrders.map((order) => (
                <li key={order.id} className="rounded-xl bg-bg-card border border-border-primary p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-fg-primary">{order.order_number}</span>
                    <span className="text-sm text-fg-secondary">{order.items?.length ?? 0} itens</span>
                  </div>
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
      })}
    </div>
  );
};
```

- [ ] **Step 4: Swap the placeholder in `MobileShell`**

Add `import { MobileKdsScreen } from './screens/MobileKdsScreen';` and add a `case 'cozinha': return <MobileKdsScreen />;` to `renderTab`. In `MobileShell.test.tsx`, mock the screen so the routing test stays pure:
```tsx
jest.mock('../screens/MobileKdsScreen', () => ({ MobileKdsScreen: () => <div data-testid="mobile-screen-cozinha" /> }));
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/mobile/__tests__/MobileKdsScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/screens/MobileKdsScreen.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/MobileKdsScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx
git commit -m "feat(mobile): tela KDS de cozinha com avanco de status"
```

---

### Task 8: `MobileNewOrderScreen` (customer search/create + items + create order)

**Files:**
- Create: `src/mobile/screens/MobileNewOrderScreen.tsx`
- Modify: `src/mobile/MobileShell.tsx` (swap the `novo` placeholder)
- Test: `src/mobile/__tests__/MobileNewOrderScreen.test.tsx`

**Interfaces:**
- Consumes: `useRootStore` (`selectedStoreId`), `crmApi.searchCustomers(storeId, q)`, `ordersService.createOrder(data: CreateOrder)`, `getProducts`-equivalent for item selection.
- Produces: `<MobileNewOrderScreen/>` — a phone-first stepper: (1) name + phone (with live customer search to prefill), (2) pick products + quantities, (3) confirm → `createOrder`.

**Scope note (YAGNI):** v1 supports a minimal order — customer name/phone, one or more product line items (product id + qty), `delivery_method: 'pickup'`, `payment_method: 'cash'`. No address/coupons/combo picker on mobile yet (use desktop for those). The `CreateOrder` payload shape (from `src/types/index.ts`):

```typescript
ordersService.createOrder({
  store: storeId,
  customer_name,
  customer_phone,
  delivery_method: 'pickup',
  delivery_fee: 0,
  payment_method: 'cash',
  items: lineItems.map((li) => ({ product_id: li.product_id, quantity: li.quantity })),
});
```

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileNewOrderScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const createOrder = jest.fn();
const searchCustomers = jest.fn();
const getProducts = jest.fn();
jest.mock('../../services/orders', () => ({ ordersService: { createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('../../services/crmApi', () => ({ crmApi: { searchCustomers: (...a: unknown[]) => searchCustomers(...a) } }));
jest.mock('../../services/products', () => ({ getProducts: (...a: unknown[]) => getProducts(...a) }));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  createOrder.mockResolvedValue({ id: 'o9', order_number: '#1009' });
  searchCustomers.mockResolvedValue({ data: [] });
  getProducts.mockResolvedValue({ results: [{ id: 'p1', name: 'X-Salada', price: 20 }] });
  useRootStore.setState({ selectedStoreId: 's1' } as never);
});

test('creates an order with the entered customer and a product', async () => {
  render(<MobileNewOrderScreen />);
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '63999990000' } });
  fireEvent.click(await screen.findByRole('button', { name: /x-salada/i }));
  fireEvent.click(screen.getByRole('button', { name: /finalizar pedido/i }));
  await waitFor(() => expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 's1', customer_name: 'Ana', customer_phone: '63999990000',
    items: [{ product_id: 'p1', quantity: 1 }],
  })));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx`
Expected: FAIL — module not found.

> **Before implementing:** confirm the products service symbol. Check `src/pages/orders/OrderNewPage.tsx` imports for how it loads products (e.g. `getProducts` from `src/services/products`). Mirror that exact import; if the name differs, update both the test mock and the implementation to match. Do not invent a name.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/screens/MobileNewOrderScreen.tsx
import React, { useEffect, useState } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { ordersService } from '../../services/orders';
import { getProducts } from '../../services/products';

interface ProductLite { id: string; name: string; price: number; }
interface LineItem { product_id: string; name: string; quantity: number; }

export const MobileNewOrderScreen: React.FC = () => {
  const storeId = useRootStore((s) => s.selectedStoreId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    getProducts({ store: storeId }).then((res: { results: ProductLite[] }) => setProducts(res.results));
  }, [storeId]);

  const addItem = (p: ProductLite) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, name: p.name, quantity: 1 }];
    });
  };

  const submit = async () => {
    if (!storeId || !name || items.length === 0) return;
    setSubmitting(true);
    try {
      const order = await ordersService.createOrder({
        store: storeId,
        customer_name: name,
        customer_phone: phone,
        delivery_method: 'pickup',
        delivery_fee: 0,
        payment_method: 'cash',
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setDone(order.order_number);
      setName(''); setPhone(''); setItems([]);
    } finally {
      setSubmitting(false);
    }
  };

  if (!storeId) return <div className="p-4 text-fg-muted">Selecione uma loja.</div>;

  return (
    <div className="p-3 space-y-4">
      {done && (
        <div className="rounded-lg bg-brand-soft p-3 text-sm text-fg-primary">
          Pedido {done} criado!
        </div>
      )}
      <div className="space-y-2">
        <label className="block text-sm text-fg-secondary" htmlFor="m-nome">Nome do cliente</label>
        <input id="m-nome" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
        <label className="block text-sm text-fg-secondary" htmlFor="m-tel">Telefone</label>
        <input id="m-tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-fg-primary" />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Produtos</h2>
        <ul className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => addItem(p)}
                className="w-full rounded-lg border border-border-primary bg-bg-card p-2 text-left text-sm text-fg-primary">
                {p.name}
                <span className="block text-xs text-fg-muted">R$ {p.price.toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {items.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">No pedido</h2>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.product_id} className="flex justify-between text-sm text-fg-primary">
                <span>{i.name}</span><span>x{i.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" disabled={submitting || !name || items.length === 0} onClick={submit}
        className="w-full rounded-lg bg-brand-500 py-3 text-base font-semibold text-white disabled:opacity-60">
        {submitting ? 'Enviando...' : 'Finalizar pedido'}
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Swap the placeholder in `MobileShell`**

Add `import { MobileNewOrderScreen } from './screens/MobileNewOrderScreen';` and `case 'novo': return <MobileNewOrderScreen />;` to `renderTab`. In `MobileShell.test.tsx` mock it:
```tsx
jest.mock('../screens/MobileNewOrderScreen', () => ({ MobileNewOrderScreen: () => <div data-testid="mobile-screen-novo" /> }));
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/screens/MobileNewOrderScreen.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/MobileNewOrderScreen.test.tsx src/mobile/__tests__/MobileShell.test.tsx
git commit -m "feat(mobile): criar pedido (cliente + produtos) no mobile"
```

---

### Task 9: `MobileMoreScreen` (links to secondary sections)

**Files:**
- Create: `src/mobile/screens/MobileMoreScreen.tsx`
- Modify: `src/mobile/MobileShell.tsx` (swap the `mais` placeholder)
- Test: `src/mobile/__tests__/MobileMoreScreen.test.tsx`

**Interfaces:**
- Consumes: React Router `<Link>`.
- Produces: `<MobileMoreScreen/>` — a list of links to existing routes (Clientes, Conversas, Produtos, Configurações). Tapping navigates; `MobileShell` then renders the desktop page through `<Outlet/>` (already wired in Task 4) with the bottom nav still visible.

- [ ] **Step 1: Write the failing test**

```tsx
// src/mobile/__tests__/MobileMoreScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileMoreScreen } from '../screens/MobileMoreScreen';

test('lists links to the secondary sections', () => {
  render(<MemoryRouter><MobileMoreScreen /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/customers');
  expect(screen.getByRole('link', { name: /conversas/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /produtos/i })).toBeInTheDocument();
});
```

> **Before implementing:** verify the real paths for these sections in `src/App.tsx` routes (e.g. `/customers`, `/conversations`, `/products`, `/settings`). Use the exact paths defined there; adjust the test hrefs to match.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileMoreScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/mobile/screens/MobileMoreScreen.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// Paths MUST match the routes declared in src/App.tsx.
const LINKS: { to: string; label: string }[] = [
  { to: '/customers', label: 'Clientes' },
  { to: '/conversations', label: 'Conversas' },
  { to: '/products', label: 'Produtos' },
  { to: '/settings', label: 'Configurações' },
];

export const MobileMoreScreen: React.FC = () => (
  <ul className="divide-y divide-border-primary">
    {LINKS.map((l) => (
      <li key={l.to}>
        <Link to={l.to} className="block px-4 py-4 text-fg-primary">{l.label}</Link>
      </li>
    ))}
  </ul>
);
```

- [ ] **Step 4: Swap the placeholder in `MobileShell`**

Add `import { MobileMoreScreen } from './screens/MobileMoreScreen';` and `case 'mais': return <MobileMoreScreen />;` to `renderTab`. The `Placeholder` component and its remaining usages can now be deleted from `MobileShell.tsx`.

- [ ] **Step 5: Run the full mobile suite + types**

Run: `npx jest src/mobile`
Expected: PASS (all mobile tests).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/mobile/screens/MobileMoreScreen.tsx src/mobile/MobileShell.tsx src/mobile/__tests__/MobileMoreScreen.test.tsx
git commit -m "feat(mobile): aba Mais com atalhos para as demais seçoes"
```

---

### Task 10: Manual verification + production build

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds (no TS errors — this is what would block Vercel).

- [ ] **Step 2: Manual smoke (device emulation)**

Run `npm run dev`, open the app, toggle device toolbar to a phone width (≤767px), log in. Verify:
- Bottom nav appears; desktop navbar does not.
- Pedidos: live orders render as cards; advancing a status updates the card.
- Cozinha: queue renders; "marcar pronto" works.
- Novo: create a pickup order; it appears in Pedidos.
- Mais → Clientes: the existing customers page renders with the bottom nav still present.
- Resize back to desktop width: the full desktop layout returns unchanged.

- [ ] **Step 3: Commit (if any doc/notes added)**

```bash
git commit --allow-empty -m "chore(mobile): verificacao manual do shell mobile"
```

---

## Self-Review

**Spec coverage:**
- PWA same project, additive only → Tasks 1–10, Global Constraints. ✓
- Viewport gate `<768px` → Task 1. ✓
- Mobile shell + bottom nav, desktop untouched → Tasks 3–4 (single MainLayout branch). ✓
- Pedidos live + status → Task 6. ✓
- Criar pedido + cliente → Task 8. ✓
- KDS → Task 7. ✓
- "Mais" fallback to existing pages → Tasks 4 (Outlet) + 9. ✓
- Push opt-in (backend already wired) → Task 5, used in Task 6. ✓
- Reuse existing services/hooks/stores → every screen task. ✓
- Tests for hook, shell-by-viewport, 3 core flows → Tasks 1,4,6,7,8. ✓

**Open items the implementer must confirm (flagged inline, not placeholders):** heroicons import path (Task 3), products service symbol name (Task 8), exact secondary route paths (Task 9). Each task says to mirror the existing source and adjust the test to match — these are verifications against real code, not invented values.

**Type consistency:** `updateOrderStatus(orderId, status)` used identically in Tasks 6–7; `ordersService.createOrder(CreateOrder)` matches `src/services/orders.ts:66`; `selectedStoreId`/`orders`/`setOrders` match `rootStore`; `statusToColumn`/`COLUMNS`/`groupKdsOrders`/`KDS_COLUMNS` match the real exports; `nextOrderStatus` shape consistent across Tasks 2 and 6.
