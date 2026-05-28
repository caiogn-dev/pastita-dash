# Cardapidex Dashboard

React/TypeScript admin dashboard for the Cardapidex multi-tenant SaaS.

## Current Direction

- Pastita branding is retired. Do not reintroduce Pastita UI, logos, colors or tenant-specific fallbacks.
- Cardapidex is the platform brand; each store controls its own logo, colors, template and public menu.
- The dashboard is for store owners/operators managing one or more stores.
- Backend source of truth lives in `/home/graco/WORK/server2`; do not use frontend docs as backend patch sources.

## Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS with CSS variables in `src/index.css`
- Zustand for auth/store selection
- React Query for server state
- Axios via `src/services/api.ts`
- React Router v6
- Heroicons/lucide for icons

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
```

## API Contract

- Auth is DRF Token: `Authorization: Token <token>`.
- Do not send JWT/Bearer auth unless backend contract changes.
- `VITE_API_URL` is the API base, currently `https://backend.pastita.com.br/api/v1` until DNS cutover.
- `VITE_WS_URL` is a base origin only, for example `wss://backend.pastita.com.br`; code appends `/ws/...`.
- `VITE_STOREFRONT_BASE_URL` defaults to `https://cardapidex.com.br`.

## Multi-Tenant Rules

- Never hardcode tenant slugs like `pastita`, `ce-saladas` or `kero-kero` as runtime fallbacks.
- Prefer selected store from `useStore()`.
- `VITE_STORE_SLUG` is optional and only for local/single-store test environments.
- Storefront URLs should use `buildStorefrontUrl()` from `src/utils/storefrontUrl.ts`.

## Core Routes

- `/` dashboard
- `/stores` store list
- `/stores/:storeId/orders` orders
- `/stores/:storeId/products` products
- `/stores/:storeId/combos` combos
- `/stores/:storeId/customers` customers
- `/stores/:storeId/storefront` public menu/theme settings
- `/stores/:storeId/settings` store settings
- `/whatsapp/chat` main WhatsApp chat
- `/whatsapp/inbox` WhatsApp inbox
- `/connections` channel connections
- `/analytics` generic reports

## UX Direction

Keep the navigation owner-focused and operational:

- Daily work: orders, chat, customers.
- Menu management: products, combos, coupons, storefront/theme.
- Configuration: delivery, payments, store settings, channels.
- Advanced tools: marketing, automation, agents and diagnostics should not dominate the primary path.

## Documentation

- `docs/CARDAPIDEX_SAAS_ALIGNMENT.md` is the main product/technical alignment note.
- `docs/CARDAPIDEX_PRODUCT_ROADMAP.md` tracks next product steps.
- Old implementation plans and store-specific docs were removed to avoid future confusion.

