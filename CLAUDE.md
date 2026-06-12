# CLAUDE.md — Cardapidex Dashboard

Admin dashboard for the Cardapidex multi-tenant SaaS. Pastita branding is retired.

## Source Of Truth

- Frontend: this repository.
- Backend/API: `/home/graco/WORK/server2`.
- Product alignment: `docs/CARDAPIDEX_SAAS_ALIGNMENT.md`.
- Roadmap: `docs/CARDAPIDEX_PRODUCT_ROADMAP.md`.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Runtime Contract

- Auth: DRF Token auth via `Authorization: Token <token>`.
- API base: `VITE_API_URL`.
- WebSocket base: `VITE_WS_URL`, base origin only. Do not include `/ws` in the env value.
- Storefront base: `VITE_STOREFRONT_BASE_URL`, default `https://cardapidex.com.br`.

Current production API may still use `backend.pastita.com.br` until DNS/backend migration is complete. That is infra state, not product branding.

## Multi-Tenant Rules

- Do not hardcode tenant slugs as runtime fallbacks.
- Use selected store from `useStore()`.
- Treat `VITE_STORE_SLUG` as optional local/test config only.
- Store-specific reports or pages must be genericized before entering main navigation.

## Navegação (CRÍTICO)

- **A navegação real do painel é a `src/components/layout/Navbar.tsx`** (barra superior com dropdowns via portal). É ela que o `MainLayout` renderiza.
- **`src/components/layout/Sidebar.tsx` é LEGADO e não é renderizado** — não adicionar itens de menu nela. Todo item novo de navegação vai na `Navbar.tsx` (array `sections`).

## Important Areas

- `src/pages/stores/StorefrontPage.tsx`: store branding, public menu template, colors and domain.
- `src/utils/storefrontUrl.ts`: public menu URL builder.
- `src/pages/orders/OrdersPage.tsx`: daily order operation.
- `src/pages/whatsapp/WhatsAppChatPage.tsx` and `src/components/chat/ChatWindow.tsx`: main WhatsApp workflow.
- `src/services/storesApi.ts`: canonical frontend service for store management.

## Message Rendering

Media message `content` can be an object. Never render `message.content` directly unless `typeof content === 'string'`.

Use `crossOrigin="anonymous"` on cross-origin media elements where needed.

