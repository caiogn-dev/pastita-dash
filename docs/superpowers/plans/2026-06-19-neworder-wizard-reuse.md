# Novo Pedido — Wizard único reutilizável + fix da rota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the existing 5-step `NewOrderDrawer` into a shared `useNewOrderWizard` hook + step components, reuse it as the mobile "Novo" tab full-screen wizard, and fix the panel's broken delivery-route calc (store slug vs UUID).

**Architecture:** A behavior-preserving refactor. The drawer's state/handlers move into `useNewOrderWizard`; its 5 step JSX blocks move into shared `newOrder/steps/*`. The desktop `NewOrderDrawer` becomes thin slide-over chrome around the hook+steps; the mobile screen becomes full-screen chrome around the SAME hook+steps. The slug bug is a one-line fix in `OrdersPage`.

**Tech Stack:** Vite, React 18, TS, React Router, Zustand (`useRootStore`), Tailwind, react-hot-toast, Jest + ts-jest + @testing-library/react.

## Global Constraints

- **Behavior-preserving refactor:** the desktop `NewOrderDrawer` must look and behave exactly as today after extraction. The 5 step JSX blocks move VERBATIM (only their imports change).
- **Store by slug, never UUID:** delivery-fee calc hits `/stores/{slug}/delivery-fee/`. Desktop: `OrdersPage` must pass the slug; mobile: slug from `useRootStore.stores.find(s => s.id === selectedStoreId)?.slug`.
- **Single source of logic:** desktop and mobile consume the SAME `useNewOrderWizard` hook and the SAME step components. No duplicated data logic.
- **Semantic Tailwind tokens** in NEW mobile chrome (`bg-bg-card`, `text-fg-*`, `bg-brand-500`, `border-border-primary`). The MOVED step JSX keeps its existing classes verbatim (do not restyle).
- Touch targets ≥44px in new mobile chrome; respect `env(safe-area-*)`.
- import.meta.env handled for `src/mobile/` by the jest transform. Mobile tests mock services.
- **No regression:** full suite shows only `ComboForm.test.tsx` failing (14, pre-existing). `tsc` clean; `npm run build` succeeds.
- Branch `feat/neworder-wizard-reuse`. Do NOT push to `main`. `npx jest src/...` per task; full `npx jest` + `tsc` before finishing each task that touches shared/desktop code.

---

## Reference: current code (verified, NewOrderDrawer.tsx, 1004 lines)

- Types/consts at top: `CartItem` (89), `PaymentMethod` + `PAYMENT_LABELS` (44-50), `STEP_LABELS` (52-58), `Customer` (78-80), `fmt` (84-85).
- Step functions (module-level, prop-driven): `StepCliente` 90-165, `StepEntrega` 167-309, `StepItens` 311-466, `StepAjustes` 468-561, `StepConfirmar` 563-678. Their exact prop interfaces are in the file.
- Main component `NewOrderDrawer` 681-1004: state (691-715), open-sync effect (719-724), `handleClose` (727-746), `handleCalculateRoute` (749-761), `addToCart`/`changeQty`/`removeFromCart` (764-779), `canProceed` (782-803), `handleSubmit` (806-869), chrome render (873-1001).
- `ordersService.calculateDeliveryFee(storeSlug, address)` → `src/services/orders.ts:75` (POST `/stores/{slug}/delivery-fee/` with `{address}`).
- Step props recap (consumers must match):
  - StepCliente: `{ storeSlug, customer, onCustomerSelected, onCustomerCleared }`
  - StepEntrega: `{ customer, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress, freeAddressText, setFreeAddressText, routeQuote, calculatingRoute, onCalculateRoute }`
  - StepItens: `{ storeId, cart, onAdd, onQtyChange, onRemove }`
  - StepAjustes: `{ discountType, setDiscountType, discountValue, setDiscountValue, discountReason, setDiscountReason, surchargeValue, setSurchargeValue, surchargeReason, setSurchargeReason }`
  - StepConfirmar: `{ cart, deliveryMethod, deliveryAddress, routeQuote, discountType, discountValue, surchargeValue, paymentMethod, setPaymentMethod, submitting, onSubmit }`

---

### Task 1: Fix the delivery-route slug bug (OrdersPage)

**Files:**
- Modify: `src/pages/orders/OrdersPage.tsx` (the NewOrderDrawer render + the storeQuery fallback)

**Why no unit test:** `OrdersPage.tsx` is a very large page component with heavy data deps; a focused unit test of its render is disproportionate. This task is a surgical prop fix verified by code inspection + `tsc` + build. (The hook that actually exercises the calc is unit-tested in Task 3.)

- [ ] **Step 1: Locate the bug**

Run: `grep -nE "storeQuery|<NewOrderDrawer|storeSlug *=|storeSlug *\\?" src/pages/orders/OrdersPage.tsx`
Expected: a `const storeQuery = storeSlug || storeId;` (UUID fallback) and a `<NewOrderDrawer storeSlug={storeQuery} ... />`.

- [ ] **Step 2: Apply the fix**

Change the `<NewOrderDrawer .../>` render so it passes the real slug and only mounts when the slug is known. Concretely:
- Pass `storeSlug={storeSlug || ''}` (the resolved slug), NOT `storeQuery`.
- Keep passing `storeId={storeId}` (UUID) for product search — the drawer uses `storeId || storeSlug` internally for products, which is correct.
- Guard the render so the drawer is not opened without a slug: wrap it as `{storeSlug && ( <NewOrderDrawer isOpen={...} storeSlug={storeSlug} storeId={storeId} ... /> )}` (preserve all other existing props verbatim — `isOpen`, `onClose`, `initialCustomer`, `onOrderCreated`).

Leave `storeQuery` for any OTHER existing usage untouched; only the NewOrderDrawer render changes.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `grep -n "NewOrderDrawer" src/pages/orders/OrdersPage.tsx` → confirm it now receives `storeSlug={storeSlug...}` (never `storeQuery`/UUID) and is slug-guarded.
Run: `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/orders/OrdersPage.tsx
git commit -m "fix(orders): NewOrderDrawer recebe slug (nao UUID) — corrige calculo de rota"
```

---

### Task 2: Extract shared types + the 5 step components

**Files:**
- Create: `src/components/orders/newOrder/types.ts`
- Create: `src/components/orders/newOrder/steps/StepCliente.tsx`
- Create: `src/components/orders/newOrder/steps/StepEntrega.tsx`
- Create: `src/components/orders/newOrder/steps/StepItens.tsx`
- Create: `src/components/orders/newOrder/steps/StepAjustes.tsx`
- Create: `src/components/orders/newOrder/steps/StepConfirmar.tsx`
- Create: `src/components/orders/newOrder/NewOrderSteps.tsx`
- Modify: `src/components/orders/NewOrderDrawer.tsx` (import the moved steps instead of inline)
- Test: `src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx`

**Interfaces:**
- Produces:
  - `newOrder/types.ts` exports: `interface CartItem { product: Product; quantity: number; notes?: string }`, `type PaymentMethod = 'pix'|'cash'|'credit_card'|'fiado'`, `const PAYMENT_LABELS: Record<PaymentMethod,string>`, `const STEP_LABELS: string[]` (the 5 labels), `interface Customer extends CustomerSearchResult { phone_number_edited?: string }`, `const fmt: (v:number)=>string`.
  - each `steps/StepX.tsx` exports its `StepX` function with the SAME prop interface as today (see Reference).
  - `NewOrderSteps.tsx` exports `<NewOrderSteps wiz={NewOrderWizard} />` — but since Task 3 defines `NewOrderWizard`, in THIS task `NewOrderSteps` is NOT created yet. **Move it to Task 3.** (This task only extracts types + steps and rewires the drawer to import them.)

- [ ] **Step 1: Create `newOrder/types.ts`**

```ts
// src/components/orders/newOrder/types.ts
import type { Product } from '../../../services/products';
import type { CustomerSearchResult } from '../../../types/crm';

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'fiado';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão',
  fiado: 'Fiado',
};

export const STEP_LABELS = ['Cliente', 'Entrega', 'Itens', 'Ajustes', 'Confirmar'];

export interface Customer extends CustomerSearchResult {
  phone_number_edited?: string;
}

export const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
```

- [ ] **Step 2: Move each step into its own file (VERBATIM body, new imports)**

For each step, cut the function body from `NewOrderDrawer.tsx` and paste it into the new file UNCHANGED, then add the imports that body references and `export`. Do not alter the JSX or logic.

- `steps/StepCliente.tsx` (from lines 90-165): imports `import React from 'react';`, `import { CustomerSearchInput } from '../../crm/CustomerSearchInput';`, `import type { Customer } from '../types';`. Export `export function StepCliente(...) {...}`.
- `steps/StepEntrega.tsx` (167-309): `import React, { useState } from 'react';` (only the hooks the body uses), the heroicons it references (check the body: it uses no icons beyond what's in the JSX — import exactly those from `@heroicons/react/24/outline`), `import type { Customer } from '../types';` and `import type { UserAddress, RouteQuote } from '../../../types/crm';`. Keep the `onCalculateRoute` prop.
- `steps/StepItens.tsx` (311-466): `import React, { useState, useRef, useEffect } from 'react';`, `import { MagnifyingGlassIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';`, `import { productsService } from '../../../services/products';`, `import type { Product } from '../../../services/products';`, `import type { CartItem } from '../types';`, and `import { fmt } from '../types';` if the body uses `fmt`.
- `steps/StepAjustes.tsx` (468-561): `import React from 'react';`, `import type { DiscountType } from '../../../types/crm';`.
- `steps/StepConfirmar.tsx` (563-678): `import React from 'react';`, `import { PAYMENT_LABELS, fmt } from '../types';`, `import type { CartItem, PaymentMethod } from '../types';`, `import type { DiscountType, RouteQuote } from '../../../types/crm';`.

> After moving, each file must compile in isolation. If a step references a helper/icon not listed above, add the exact import it needs (the reference is literally in the moved body — match it). Do NOT introduce new logic.

- [ ] **Step 3: Rewire NewOrderDrawer to import the moved steps**

In `NewOrderDrawer.tsx`: delete the 5 inline step function definitions (lines 90-678) and the now-shared type/const decls (`CartItem`, `PaymentMethod`, `PAYMENT_LABELS`, `STEP_LABELS`, `Customer`, `fmt`). Add imports:
```ts
import { StepCliente } from './newOrder/steps/StepCliente';
import { StepEntrega } from './newOrder/steps/StepEntrega';
import { StepItens } from './newOrder/steps/StepItens';
import { StepAjustes } from './newOrder/steps/StepAjustes';
import { StepConfirmar } from './newOrder/steps/StepConfirmar';
import { STEP_LABELS, type CartItem, type PaymentMethod, type Customer } from './newOrder/types';
```
Keep the main `NewOrderDrawer` component (state, handlers, chrome) EXACTLY as it is — it still references `StepCliente` etc. (now imported) and `STEP_LABELS`/`CartItem`/`PaymentMethod`/`Customer` (now imported). Remove any now-unused icon imports that only the moved steps used (e.g. `MagnifyingGlassIcon`, `PlusIcon`, `MinusIcon`, `TrashIcon` if the chrome no longer references them — keep `XMarkIcon`, `ChevronRightIcon`, `ChevronLeftIcon` used by the chrome).

- [ ] **Step 4: Write a drawer smoke test (guards the refactor)**

```tsx
// src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx
import { render, screen } from '@testing-library/react';
jest.mock('../../crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { NewOrderDrawer } from '../NewOrderDrawer';

test('renders step 1 (Cliente) with progress when open', () => {
  render(<NewOrderDrawer isOpen storeSlug="loja-1" storeId="uuid-1" onClose={() => {}} />);
  expect(screen.getByText(/Novo Pedido/i)).toBeInTheDocument();
  expect(screen.getByText(/Passo 1 de 5/i)).toBeInTheDocument();
  expect(screen.getByTestId('customer-search')).toBeInTheDocument();
});

test('renders nothing when closed', () => {
  const { container } = render(<NewOrderDrawer isOpen={false} storeSlug="loja-1" onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 5: Run + verify**

Run: `npx jest src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx` → PASS (2).
Run: `npx tsc --noEmit` → clean.
Run: `npx jest` → only ComboForm fails.

- [ ] **Step 6: Commit**

```bash
git add src/components/orders/newOrder src/components/orders/NewOrderDrawer.tsx src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx
git commit -m "refactor(orders): extrai tipos e as 5 etapas do NewOrderDrawer para newOrder/"
```

---

### Task 3: Extract `useNewOrderWizard` hook + `NewOrderSteps`; drawer becomes chrome

**Files:**
- Create: `src/components/orders/newOrder/useNewOrderWizard.ts`
- Create: `src/components/orders/newOrder/NewOrderSteps.tsx`
- Modify: `src/components/orders/NewOrderDrawer.tsx` (consume the hook)
- Test: `src/components/orders/newOrder/__tests__/useNewOrderWizard.test.ts`

**Interfaces:**
- Produces: `useNewOrderWizard(opts): NewOrderWizard` and `<NewOrderSteps wiz={NewOrderWizard} />`.
- `NewOrderWizard` shape (consumed by drawer + mobile + NewOrderSteps):

```ts
export interface UseNewOrderWizardOpts {
  storeSlug: string;
  storeId?: string;
  initialCustomer?: import('../../../types/crm').CustomerSearchResult | null;
  onCreated?: () => void;
}
export interface NewOrderWizard {
  step: number; setStep: (n: number) => void; next: () => void; back: () => void; canProceed: () => boolean;
  customer: Customer | null; setCustomer: (c: Customer | null) => void;
  deliveryMethod: 'delivery' | 'pickup'; setDeliveryMethod: (m: 'delivery' | 'pickup') => void;
  selectedAddress: UserAddress | null; setSelectedAddress: (a: UserAddress | null) => void;
  freeAddressText: string; setFreeAddressText: (v: string) => void;
  routeQuote: RouteQuote | null; calculatingRoute: boolean; handleCalculateRoute: (address: string) => Promise<void>;
  cart: CartItem[]; addToCart: (p: Product) => void; changeQty: (id: string, qty: number) => void; removeFromCart: (id: string) => void;
  discountType: DiscountType; setDiscountType: (v: DiscountType) => void;
  discountValue: string; setDiscountValue: (v: string) => void; discountReason: string; setDiscountReason: (v: string) => void;
  surchargeValue: string; setSurchargeValue: (v: string) => void; surchargeReason: string; setSurchargeReason: (v: string) => void;
  paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void; submitting: boolean; handleSubmit: () => Promise<void>;
  reset: () => void; productStoreKey: string; storeSlug: string;
}
```

- [ ] **Step 1: Write the hook (move state + handlers from the drawer)**

```ts
// src/components/orders/newOrder/useNewOrderWizard.ts
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ordersService } from '../../../services/orders';
import type { Product } from '../../../services/products';
import type { CustomerSearchResult, UserAddress, DiscountType, RouteQuote } from '../../../types/crm';
import type { CartItem, PaymentMethod, Customer } from './types';

export interface UseNewOrderWizardOpts {
  storeSlug: string;
  storeId?: string;
  initialCustomer?: CustomerSearchResult | null;
  onCreated?: () => void;
}

export interface NewOrderWizard { /* exactly the interface above */ }

export function useNewOrderWizard(opts: UseNewOrderWizardOpts): NewOrderWizard {
  const { storeSlug, storeId, initialCustomer = null, onCreated } = opts;
  const productStoreKey = storeId || storeSlug;

  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer as Customer | null);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [freeAddressText, setFreeAddressText] = useState('');
  const [routeQuote, setRouteQuote] = useState<RouteQuote | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [surchargeValue, setSurchargeValue] = useState('');
  const [surchargeReason, setSurchargeReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(0); setCustomer(null); setDeliveryMethod('delivery'); setSelectedAddress(null);
    setFreeAddressText(''); setRouteQuote(null); setCart([]); setDiscountType('percent');
    setDiscountValue(''); setDiscountReason(''); setSurchargeValue(''); setSurchargeReason('');
    setPaymentMethod('pix'); setSubmitting(false);
  };

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleCalculateRoute = async (address: string) => {
    if (!address.trim() || !storeSlug) return;
    setCalculatingRoute(true);
    try {
      const data = await ordersService.calculateDeliveryFee(storeSlug, address);
      setRouteQuote({ fee: data.fee, distance_km: data.distance_km, duration_minutes: data.duration_minutes });
    } catch {
      toast.error('Erro ao calcular rota');
      setRouteQuote(null);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const addToCart = (product: Product) =>
    setCart((prev) => (prev.some((c) => c.product.id === product.id) ? prev : [...prev, { product, quantity: 1 }]));
  const changeQty = (productId: string, qty: number) =>
    setCart((prev) => prev.map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c)));
  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const canProceed = (): boolean => {
    if (step === 0) {
      if (!customer) return false;
      const isNewCustomer = customer.id === '';
      if (isNewCustomer) {
        const phone = customer.phone_number_edited || customer.phone_number;
        return Boolean(phone && phone.replace(/\D/g, '').length >= 10);
      }
      return true;
    }
    if (step === 1) return deliveryMethod === 'pickup' || freeAddressText.trim().length > 0;
    if (step === 2) return cart.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!customer || cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const deliveryAddress = deliveryMethod === 'delivery' ? freeAddressText.trim() : undefined;
      const apiPaymentMethod: 'pix' | 'cash' | 'credit_card' | 'debit_card' =
        paymentMethod === 'fiado' ? 'cash' : (paymentMethod as 'pix' | 'cash' | 'credit_card');
      const isNewCustomer = customer.id === '';
      const customerPhone = isNewCustomer ? (customer.phone_number_edited || customer.phone_number) : customer.phone_number;
      const orderSubtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
      const discountRaw = parseFloat(discountValue) || 0;
      const discountAmount = discountType === 'percent' ? Math.round(orderSubtotal * discountRaw) / 100 : discountRaw;
      const surchargeAmount = parseFloat(surchargeValue) || 0;
      const adjustmentReason = [discountReason.trim(), surchargeReason.trim()].filter(Boolean).join(' | ');

      const created = await ordersService.createOrder({
        store: storeSlug,
        customer_name: customer.name || 'Cliente PDV',
        customer_phone: customerPhone.replace(/\D/g, ''),
        customer_email: customer.email,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryMethod === 'delivery' ? (routeQuote?.fee ?? 0) : 0,
        items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
        payment_method: apiPaymentMethod,
        notes: paymentMethod === 'fiado' ? 'Fiado' : undefined,
        ...(discountAmount > 0 ? { discount: Number(discountAmount.toFixed(2)) } : {}),
        ...(surchargeAmount > 0 ? { surcharge: Number(surchargeAmount.toFixed(2)) } : {}),
        ...(adjustmentReason ? { adjustment_reason: adjustmentReason } : {}),
      });

      const pixLink = (created as { pix_ticket_url?: string })?.pix_ticket_url || '';
      const pixCode = (created as { pix_code?: string })?.pix_code || '';
      const paymentError = (created as { payment_error?: string })?.payment_error;
      if (paymentMethod === 'pix' && (pixLink || pixCode)) {
        try {
          await navigator.clipboard.writeText(pixLink || pixCode);
          toast.success('Pedido criado! Link PIX copiado — cole no WhatsApp do cliente.', { duration: 6000 });
        } catch {
          toast.success('Pedido criado! Abra o pedido para ver o PIX.', { duration: 6000 });
        }
      } else if (paymentMethod === 'pix' && paymentError) {
        toast.error(`Pedido criado, mas o PIX falhou: ${paymentError}`, { duration: 8000 });
      } else {
        toast.success('Pedido criado com sucesso!');
      }
      onCreated?.();
    } catch {
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step, setStep, next, back, canProceed,
    customer, setCustomer, deliveryMethod, setDeliveryMethod, selectedAddress, setSelectedAddress,
    freeAddressText, setFreeAddressText, routeQuote, calculatingRoute, handleCalculateRoute,
    cart, addToCart, changeQty, removeFromCart,
    discountType, setDiscountType, discountValue, setDiscountValue, discountReason, setDiscountReason,
    surchargeValue, setSurchargeValue, surchargeReason, setSurchargeReason,
    paymentMethod, setPaymentMethod, submitting, handleSubmit,
    reset, productStoreKey, storeSlug,
  };
}
```

> Note: this hook drops the drawer's open-sync `useEffect` (that was `isOpen`-specific). The drawer re-implements open/init in its own chrome (Step 3). The hook's `handleSubmit` now ends with `onCreated?.()` instead of `onOrderCreated?.()` + `handleClose()` — the chrome decides what happens after success.

- [ ] **Step 2: Write the hook test**

```ts
// src/components/orders/newOrder/__tests__/useNewOrderWizard.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';

const calculateDeliveryFee = jest.fn();
const createOrder = jest.fn();
jest.mock('../../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: (...a: unknown[]) => calculateDeliveryFee(...a), createOrder: (...a: unknown[]) => createOrder(...a) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useNewOrderWizard } from '../useNewOrderWizard';

const PRODUCT = { id: 'p1', price: 20 } as never;

beforeEach(() => {
  calculateDeliveryFee.mockResolvedValue({ fee: 9, distance_km: 2.3, duration_minutes: 21 });
  createOrder.mockResolvedValue({ order_number: '#1009' });
});

test('canProceed gates step 0 on customer + valid phone', () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  expect(result.current.canProceed()).toBe(false);
  act(() => result.current.setCustomer({ id: '', name: 'Ana', phone_number: '63999990000', phone_number_edited: '63999990000', email: '' } as never));
  expect(result.current.canProceed()).toBe(true);
});

test('handleCalculateRoute stores the quote', async () => {
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1' }));
  await act(async () => { await result.current.handleCalculateRoute('Rua X, 100'); });
  expect(calculateDeliveryFee).toHaveBeenCalledWith('loja-1', 'Rua X, 100');
  expect(result.current.routeQuote).toEqual({ fee: 9, distance_km: 2.3, duration_minutes: 21 });
});

test('handleSubmit sends slug + delivery_fee from the quote and calls onCreated', async () => {
  const onCreated = jest.fn();
  const { result } = renderHook(() => useNewOrderWizard({ storeSlug: 'loja-1', onCreated }));
  act(() => {
    result.current.setCustomer({ id: 'c1', name: 'Ana', phone_number: '63999990000', email: '' } as never);
    result.current.addToCart(PRODUCT);
    result.current.setFreeAddressText('Rua X, 100');
  });
  await act(async () => { await result.current.handleCalculateRoute('Rua X, 100'); });
  await act(async () => { await result.current.handleSubmit(); });
  expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
    store: 'loja-1', delivery_method: 'delivery', delivery_fee: 9,
    items: [{ product_id: 'p1', quantity: 1 }],
  }));
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
});
```

- [ ] **Step 3: Make NewOrderDrawer consume the hook (thin chrome)**

Replace the body of `NewOrderDrawer` (the state block + handlers, lines ~689-869) with a single hook call and a chrome-local close. Keep the EXACT same chrome JSX (backdrop, header "Passo X de 5", progress bar, content step-switch, footer), but source every value/handler from `wiz`. Add at the top of the component:
```ts
  const wiz = useNewOrderWizard({ storeSlug, storeId, initialCustomer, onCreated: () => { onOrderCreated?.(); doClose(); } });
  const doClose = () => { wiz.reset(); onClose(); };
  useEffect(() => { if (isOpen) { wiz.reset(); wiz.setCustomer((initialCustomer ?? null) as never); } }, [isOpen, initialCustomer]);
```
Then in the JSX: backdrop `onClick={doClose}`; header X `onClick={doClose}`; `Passo {wiz.step + 1} de {STEP_LABELS.length}: {STEP_LABELS[wiz.step]}`; progress `i <= wiz.step`; the content switch uses `wiz.step` and passes `wiz.*` to each step (e.g. `<StepCliente storeSlug={storeSlug} customer={wiz.customer} onCustomerSelected={wiz.setCustomer} onCustomerCleared={() => wiz.setCustomer(null)} />`, `<StepItens storeId={wiz.productStoreKey} cart={wiz.cart} onAdd={wiz.addToCart} onQtyChange={wiz.changeQty} onRemove={wiz.removeFromCart} />`, etc.); footer Voltar `onClick={wiz.back}` disabled `wiz.step===0`, Próximo `onClick={wiz.next}` disabled `!wiz.canProceed()`. Import `useNewOrderWizard` and keep `useEffect` imported.

> The `wiz.reset()` + `useEffect` reproduce the old open-sync/handleClose behavior, so the drawer behaves identically. The smoke test from Task 2 must still pass.

- [ ] **Step 4: Create `NewOrderSteps.tsx` (shared step switch for both chromes)**

```tsx
// src/components/orders/newOrder/NewOrderSteps.tsx
import React from 'react';
import { StepCliente } from './steps/StepCliente';
import { StepEntrega } from './steps/StepEntrega';
import { StepItens } from './steps/StepItens';
import { StepAjustes } from './steps/StepAjustes';
import { StepConfirmar } from './steps/StepConfirmar';
import type { NewOrderWizard } from './useNewOrderWizard';

export const NewOrderSteps: React.FC<{ wiz: NewOrderWizard }> = ({ wiz }) => {
  switch (wiz.step) {
    case 0:
      return <StepCliente storeSlug={wiz.storeSlug} customer={wiz.customer} onCustomerSelected={wiz.setCustomer} onCustomerCleared={() => wiz.setCustomer(null)} />;
    case 1:
      return <StepEntrega customer={wiz.customer} deliveryMethod={wiz.deliveryMethod} setDeliveryMethod={wiz.setDeliveryMethod} selectedAddress={wiz.selectedAddress} setSelectedAddress={wiz.setSelectedAddress} freeAddressText={wiz.freeAddressText} setFreeAddressText={wiz.setFreeAddressText} routeQuote={wiz.routeQuote} calculatingRoute={wiz.calculatingRoute} onCalculateRoute={wiz.handleCalculateRoute} />;
    case 2:
      return <StepItens storeId={wiz.productStoreKey} cart={wiz.cart} onAdd={wiz.addToCart} onQtyChange={wiz.changeQty} onRemove={wiz.removeFromCart} />;
    case 3:
      return <StepAjustes discountType={wiz.discountType} setDiscountType={wiz.setDiscountType} discountValue={wiz.discountValue} setDiscountValue={wiz.setDiscountValue} discountReason={wiz.discountReason} setDiscountReason={wiz.setDiscountReason} surchargeValue={wiz.surchargeValue} setSurchargeValue={wiz.setSurchargeValue} surchargeReason={wiz.surchargeReason} setSurchargeReason={wiz.setSurchargeReason} />;
    default:
      return <StepConfirmar cart={wiz.cart} deliveryMethod={wiz.deliveryMethod} deliveryAddress={wiz.freeAddressText} routeQuote={wiz.routeQuote} discountType={wiz.discountType} discountValue={wiz.discountValue} surchargeValue={wiz.surchargeValue} paymentMethod={wiz.paymentMethod} setPaymentMethod={wiz.setPaymentMethod} submitting={wiz.submitting} onSubmit={wiz.handleSubmit} />;
  }
};
```

Optionally refactor the drawer's content switch to `<NewOrderSteps wiz={wiz} />` (keeps drawer DRY); not required for the drawer to work, but do it so desktop + mobile share the exact switch.

- [ ] **Step 5: Run + verify**

Run: `npx jest src/components/orders/newOrder/__tests__/useNewOrderWizard.test.ts` → PASS (3).
Run: `npx jest src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx` → still PASS.
Run: `npx tsc --noEmit` → clean. Run: `npx jest` → only ComboForm fails.

- [ ] **Step 6: Commit**

```bash
git add src/components/orders/newOrder src/components/orders/NewOrderDrawer.tsx
git commit -m "refactor(orders): useNewOrderWizard + NewOrderSteps; drawer vira chrome fino"
```

---

### Task 4: Mobile "Novo" tab — full-screen wizard reusing the hook + steps

**Files:**
- Modify (rewrite): `src/mobile/screens/MobileNewOrderScreen.tsx`
- Modify (replace): `src/mobile/__tests__/MobileNewOrderScreen.test.tsx`

**Interfaces:**
- Consumes: `useNewOrderWizard`, `NewOrderSteps`, `STEP_LABELS`, `useRootStore` (selectedStoreId + stores), react-router `useNavigate`.
- Behavior: full-screen (`fixed inset-0 z-[60]`) wizard; top = X (→ `/?tab=pedidos`) + progress + step title; middle = `<NewOrderSteps wiz={wiz}/>` (scroll); footer = Voltar (hidden on step 0) / Próximo (steps 0-3, disabled `!canProceed()`) / "Finalizar pedido" (step 4, `submitting`); on success → navigate `/?tab=pedidos`. No store → "Selecione uma loja".

- [ ] **Step 1: Replace the test**

```tsx
// src/mobile/__tests__/MobileNewOrderScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

const navigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }));
jest.mock('../../components/crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  navigate.mockClear();
  useRootStore.setState({ selectedStoreId: 's1', stores: [{ id: 's1', name: 'Loja 1', slug: 'loja-1' }] } as never);
});

test('starts on step 1 (Cliente) with progress and X', () => {
  render(<MobileNewOrderScreen />);
  expect(screen.getByText(/Passo 1 de 5/i)).toBeInTheDocument();
  expect(screen.getByTestId('customer-search')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pr.ximo/i })).toBeDisabled(); // no customer yet
});

test('X navigates back to the orders tab', () => {
  render(<MobileNewOrderScreen />);
  fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
  expect(navigate).toHaveBeenCalledWith('/?tab=pedidos');
});

test('shows placeholder when no store is selected', () => {
  useRootStore.setState({ selectedStoreId: null, stores: [] } as never);
  render(<MobileNewOrderScreen />);
  expect(screen.getByText(/selecione uma loja/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx`
Expected: FAIL (current screen has no steps / no X / different markup).

- [ ] **Step 3: Rewrite the screen**

```tsx
// src/mobile/screens/MobileNewOrderScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../../stores/rootStore';
import { useNewOrderWizard } from '../../components/orders/newOrder/useNewOrderWizard';
import { NewOrderSteps } from '../../components/orders/newOrder/NewOrderSteps';
import { STEP_LABELS } from '../../components/orders/newOrder/types';

export const MobileNewOrderScreen: React.FC = () => {
  const navigate = useNavigate();
  const storeId = useRootStore((s) => s.selectedStoreId);
  const stores = useRootStore((s) => s.stores);
  const slug = stores.find((s) => s.id === storeId)?.slug ?? '';

  const goToOrders = () => navigate('/?tab=pedidos');
  const wiz = useNewOrderWizard({ storeSlug: slug, storeId: storeId ?? undefined, onCreated: goToOrders });

  if (!storeId || !slug) {
    return <div className="p-6 text-center text-fg-muted">Selecione uma loja para criar um pedido.</div>;
  }

  const isLast = wiz.step === 4;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg-secondary text-fg-primary">
      <header className="flex items-center gap-2 border-b border-border-primary bg-bg-card px-3 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <button type="button" aria-label="Fechar" onClick={goToOrders} className="p-2">
          <XMarkIcon className="h-5 w-5 text-fg-muted" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-fg-primary">Novo pedido</div>
          <div className="text-xs text-fg-muted">Passo {wiz.step + 1} de {STEP_LABELS.length}: {STEP_LABELS[wiz.step]}</div>
        </div>
      </header>
      <div className="flex gap-1 px-3 py-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className={`h-1 flex-1 rounded-full ${i <= wiz.step ? 'bg-brand-500' : 'bg-bg-card'}`} />
        ))}
      </div>

      <main className="flex-1 overflow-auto px-3 py-3">
        <NewOrderSteps wiz={wiz} />
      </main>

      <footer className="flex items-center justify-between gap-2 border-t border-border-primary bg-bg-card px-3 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
        {wiz.step > 0 ? (
          <button type="button" onClick={wiz.back} className="flex items-center gap-1 rounded-xl border border-border-primary px-4 py-2.5 text-sm text-fg-secondary">
            <ChevronLeftIcon className="h-4 w-4" /> Voltar
          </button>
        ) : <span />}
        {isLast ? (
          <button type="button" disabled={wiz.submitting || !wiz.canProceed()} onClick={wiz.handleSubmit}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {wiz.submitting ? 'Enviando...' : 'Finalizar pedido'}
          </button>
        ) : (
          <button type="button" disabled={!wiz.canProceed()} onClick={wiz.next}
            className="flex items-center gap-1 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            Próximo <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
};
```

> Note: `StepConfirmar` has its own internal submit button (`onSubmit`); the mobile footer ALSO offers "Finalizar pedido" on step 4 — both call `wiz.handleSubmit`. This is acceptable (two affordances for the same action). If the reviewer flags redundancy, prefer keeping the footer action and it's fine that the step's button also works.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/mobile/__tests__/MobileNewOrderScreen.test.tsx` → PASS (3).
Run: `npx jest src/mobile` → all green (MobileShell test mocks the screen, unaffected).
Run: `npx tsc --noEmit` → clean. Run: `npx jest` → only ComboForm fails.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/MobileNewOrderScreen.tsx src/mobile/__tests__/MobileNewOrderScreen.test.tsx
git commit -m "feat(mobile): aba Novo reusa o wizard do drawer (5 etapas + calculo de rota)"
```

---

### Task 5: Verification + production build

**Files:** none.

- [ ] **Step 1: Full suite + types + build**

Run: `npx jest` → `Test Suites: 1 failed` (only ComboForm), all else pass.
Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 2: Manual smoke (device emulation)**

`npm run dev`, phone width, log in:
- Desktop (wide): open Orders → "Novo pedido" drawer → 5 steps work, on step Entrega type an address → "Calcular" shows distance+fee (no "Erro ao calcular rota"), create an order.
- Mobile (≤767px): Novo tab → full-screen wizard, X returns to Pedidos, step Entrega calculates the fee, finalize → lands on Pedidos with the new order.

- [ ] **Step 3: Commit (notes only, if any)**

```bash
git commit --allow-empty -m "chore(orders): verificacao manual do wizard reutilizavel"
```

---

## Self-Review

**Spec coverage:**
- Slug bug fix (panel route calc) → Task 1. ✓
- Extract steps + types → Task 2. Extract hook + NewOrderSteps + drawer-as-chrome → Task 3. ✓
- Mobile reuse (full-screen wizard, X→Pedidos, route calc, success→Pedidos) → Task 4. ✓
- Behavior-preserving drawer → smoke test (Task 2) kept passing through Task 3. ✓
- Slug from rootStore on mobile → Task 4. ✓
- Delivery fee into payload → hook `handleSubmit` (Task 3), asserted in hook test. ✓
- Verification/build → Task 5. ✓

**Placeholder scan:** none — new artifacts have full code; moved steps reference exact line ranges + listed imports.

**Type consistency:** `NewOrderWizard` shape defined in Task 3 is consumed identically by `NewOrderSteps` (Task 3) and the mobile chrome (Task 4); step prop interfaces match the Reference block and the original file; `ordersService.calculateDeliveryFee(slug, address)` and `createOrder` payload match the original drawer verbatim.

**Implementer notes (verify against real code, not invented):**
- The exact line ranges for the step moves (Task 2) are from the current file; if line numbers drifted, locate each `function StepX(` and move its whole body. Add only the imports its body references.
- `RouteQuote`, `UserAddress`, `DiscountType`, `CustomerSearchResult` live in `src/types/crm`. `Product`/`productsService` in `src/services/products`. Keep those import paths.
- Confirm `ordersService.calculateDeliveryFee` return type field names (`fee`, `distance_km`, `duration_minutes`) — used by `handleCalculateRoute` verbatim from the original.
