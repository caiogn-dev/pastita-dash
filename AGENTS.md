# Pastita Dashboard — Repository Knowledge

React/TypeScript admin dashboard for the Pastita/CE Saladas multi-tenant platform.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 (Chakra UI migration complete) |
| State | Zustand (auth + store selection) + React Query (server state) |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Icons | @heroicons/react |
| Toast | react-hot-toast |
| HTTP | Axios (base instance in `src/services/api.ts`) |
| WebSocket | Custom WS manager in `src/services/websocket.ts` |
| Routing | React Router v6 |

## Authentication

**DRF Token** (not JWT). `Authorization: Token <token>`.

- Auth state: `useAuthStore()` (Zustand, `src/context/AuthContext.tsx`)
- Token stored in `localStorage` via the auth store
- API instance auto-attaches token via request interceptor in `src/services/api.ts`

## Project Structure

```
src/
├── components/
│   ├── common/          # Button, Card, Modal, Input, Badge, PageLoading, etc.
│   ├── layout/          # Sidebar, Header, Layout wrapper
│   └── orders/          # OrdersKanban, OrderCard, StatusBadge
├── context/
│   ├── AuthContext.tsx  # useAuthStore (Zustand) — user, token, login/logout
│   ├── StoreContext.tsx # useStoreContext — current store selection
│   └── WhatsAppWsContext.tsx  # Global WhatsApp WebSocket
├── hooks/
│   ├── useStore.ts      # Convenience hook: storeId, storeSlug
│   ├── useHandover.ts   # Handover protocol hooks
│   └── ...
├── pages/               # One folder per domain
│   ├── dashboard/       # DashboardPage.tsx
│   ├── orders/          # OrdersPage, OrderDetailPage, OrderNewPage
│   ├── products/        # ProductsPageNew.tsx
│   ├── conversations/   # ConversationsPage, ChatWindow
│   ├── whatsapp/        # WhatsApp account/inbox pages
│   ├── automation/      # AutomationPage, flows, stats
│   ├── agents/          # AgentListPage, AgentDetailPage, AgentCreate, AgentTest
│   ├── marketing/       # Marketing dashboard, email campaigns
│   ├── analytics/       # AnalyticsPage (reports + charts)
│   ├── settings/        # SettingsPage
│   ├── handover/        # HandoverRequestsPage
│   ├── debug/           # AgentDebugPage (diagnostic tool)
│   └── ...
├── services/            # API service modules (one per domain)
│   ├── api.ts           # Axios base instance
│   ├── auth.ts          # Auth endpoints
│   ├── orders.ts        # Orders CRUD
│   ├── products.ts      # Products CRUD
│   ├── storesApi.ts     # Store management (canonical)
│   ├── dashboard.ts     # Dashboard stats
│   ├── reports.ts       # Analytics/reports
│   ├── whatsapp.ts      # WhatsApp API
│   ├── conversations.ts # Conversations API
│   ├── handover.ts      # Handover protocol
│   ├── automation.ts    # Automation API
│   ├── agents.ts        # AI agents API
│   ├── marketingService.ts # Email marketing (canonical)
│   └── ...
├── types/               # TypeScript types
│   ├── index.ts         # Core domain types
│   ├── dashboard.ts     # Dashboard-specific types
│   └── ...
└── App.tsx              # React Router routes
```

## API Contract

- Base URL: `${VITE_API_URL}/api/v1/` (set in `.env`)
- Auth: `Authorization: Token <token>` on all requests
- Backend: DRF Token (NOT JWT — do not send `Bearer`)

## Key Pages and Routes

| Route | Component | Status |
|---|---|---|
| `/` | DashboardPage | ✅ Live |
| `/stores/:storeId/orders` | OrdersPage (Kanban) | ✅ Live |
| `/stores/:storeId/orders/new` | OrderNewPage | ✅ Live |
| `/stores/:storeId/orders/:id` | OrderDetailPage | ✅ Live |
| `/stores/:storeId/products` | ProductsPageNew | ✅ Live |
| `/conversations` | ConversationsPage | ✅ Live |
| `/whatsapp/accounts` | AccountsPage | ✅ Live |
| `/automation` | AutomationPage | ✅ Live |
| `/agents` | AgentListPage | ✅ Live |
| `/agents/new` | AgentCreatePage | ✅ Live |
| `/analytics` | AnalyticsPage | ✅ Live |
| `/marketing` | MarketingDashboard | ✅ Live |
| `/settings` | SettingsPage | ✅ Live |
| `/handover/requests` | HandoverRequestsPage | ✅ Live |
| `/debug/agent` | AgentDebugPage | ✅ Live |

## WebSocket (WhatsAppWsContext)

Global singleton WebSocket for WhatsApp dashboard events.

- URL: `wss://{API_HOST}/ws/whatsapp/dashboard/?token={token}`
- Reconnection: exponential backoff (1s → 30s max)
- Keepalive: ping/pong every 30s

Events received:
- `message_received`, `message_sent`, `status_updated`
- `conversation_updated`
- `order_created`, `order_status_changed`, `payment_received`
- `handover_requested`, `handover_assigned`

## Handover Protocol

Frontend fully implemented. Backend: `apps.handover`.

- Service: `src/services/handover.ts`
- Hooks: `src/hooks/useHandover.ts`
- Page: `HandoverRequestsPage.tsx`
- Debug: `AgentDebugPage.tsx` — check/force handover mode for any conversation

## Component System

**Single canonical system**: `src/components/common/`

Components: `Button`, `Card`, `Modal`, `Input`, `Badge`, `PageLoading`, `Table`, `Pagination`, `Select`, `Textarea`, `LoadingSpinner`, `EmptyState`, `ConfirmDialog`.

Do NOT use Chakra UI components directly. The Chakra migration is complete — all pages use native HTML + Tailwind.

## Known Issues

1. **Recharts TypeScript** — Tooltip `formatter` prop: use `(v) => [String(v), label]` pattern to avoid type mismatch with `ValueType`.
2. **ChakraProvider still in main.tsx** — The root provider was kept for backward compat with `theme.ts`. It can be removed once `ThemeToggle` and base styles are fully ported.
3. **`src/pages/reports/AnalyticsPage.tsx`** — Note: this is in `reports/` subfolder, not `analytics/`.

## Commands

```bash
npm run dev          # Development server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Design System

Tailwind CSS v4 with custom design tokens defined in `tailwind.config.js`:
- Brand: Marsala palette (`brand-500` = `#722F37`)
- Semantic tokens: `bg-bg-primary`, `text-fg-primary`, `border-border-primary`, etc.
- Dark mode: `class` strategy (`.dark` on `<html>`)

Icons: `@heroicons/react/24/outline` (always outline variant, never solid unless explicitly needed).
