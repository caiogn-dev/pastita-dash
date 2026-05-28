# Cardapidex SaaS Alignment

## Decision

Pastita is being fully transformed into Cardapidex. There is no active legacy customer requirement to preserve Pastita branding in the dashboard.

Cardapidex should be treated as a multi-tenant SaaS for store owners who may manage one or more stores.

## Product Direction

- Default brand: Cardapidex.
- Tenant brand: each store controls logo, colors, template, domain and menu presentation.
- Public storefront base: `https://cardapidex.com.br/{store.slug}` unless the store has a custom domain.
- Dashboard UX should prioritize owner workflows: orders, chat, customers, menu, delivery, settings and reports.
- Avoid hardcoded store-specific pages such as Ce-Saladas dashboards in the main navigation/product surface.

## Technical Rules

- Do not hardcode a tenant slug such as `pastita`, `ce-saladas` or `kero-kero` as a runtime fallback.
- Prefer selected store from `useStore()`; only use `VITE_STORE_SLUG` for local/single-tenant test environments.
- Keep API domain on `backend.pastita.com.br` only until DNS/backend cutover is ready.
- `VITE_WS_URL` must be a base origin only, for example `wss://backend.pastita.com.br`; code appends `/ws/...`.
- Storefront links must use `VITE_STOREFRONT_BASE_URL`, defaulting to `https://cardapidex.com.br`.

## Migration Order

1. Finish frontend rebrand and remove visible Pastita/Ce-Saladas leftovers.
2. Validate dashboard flows on production build: login, store selection, orders, WhatsApp chat, products, storefront settings.
3. Deploy current Cardapidex build to the existing dashboard domain or a new Cardapidex dashboard domain.
4. Cut over backend/API domains after Cloudflare/tunnel/DNS are confirmed.
5. Add SaaS subscription/onboarding flows: plans, billing status, trial, feature gates and owner self-service setup.

