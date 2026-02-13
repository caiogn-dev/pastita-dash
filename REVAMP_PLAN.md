# Pastita Dash Revamp Plan (Backend-aligned)

## Goals
- Align dashboard with the current backend and multi-tenant model.
- Remove duplicate/legacy pages and services.
- Centralize data access and reduce drift.
- Improve UX clarity and consistency without breaking flows.

## Inputs (as of 2026-01-29)
- `pastita-dash/AGENTS.md` (current dashboard architecture, endpoints, and page status).
- `API_ENDPOINTS.md` (generic API endpoints list and auth examples).
- Backend source of truth: `server/` (not parsed here; confirm mismatches below).

## Current functional areas (from AGENTS.md)
- Dashboard, Orders (Kanban), Products, Coupons, Conversations, Messages, WhatsApp Accounts,
  Marketing, Email campaigns, Subscribers, Automations, Analytics, Stores, Langflow, Settings.
- Multi-tenant is already implemented and uses store context.
- Auth uses JWT in httpOnly cookie with auto-refresh.
- Duplicate pages to consolidate: `ProductsPage` -> `ProductsPageNew`,
  `OrderDetailPage` -> `OrderDetailPageNew`.
- Legacy page to remove: Delivery Zones.

## Priorities

### P0 (critical, stabilize and de-risk)
1. Consolidate orders data model and service usage:
   - Drop `unifiedApi`; normalize order model in Orders Kanban + Orders Page.
2. Remove duplicate/legacy pages:
   - Keep `ProductsPageNew` and `OrderDetailPageNew`.
   - Remove legacy Delivery Zones route from navigation.
3. Remove deprecated services:
   - `pastitaApi`, `productsService`, `unifiedApi` (if truly unused).
4. Normalize API client behavior:
   - Ensure `withCredentials` and refresh flow match httpOnly cookie auth.
   - Consistent error handling and retry strategy.
5. Enforce store scoping on all data:
   - `useStore()` is the only source for storeId; no ad-hoc store IDs.

### P1 (high, core UX + core business flows)
1. Auth UX polish:
   - Login, logout, profile/password change, and protected routes.
2. Layout/navigation:
   - Sidebar (collapsible), topbar (store switcher, notifications, user menu),
     breadcrumbs, and mobile drawer menu.
3. Data layer stability:
   - Typed API layer; pagination helpers; query builders for search/filter.
   - Form validation schemas (Zod) and upload service with progress.
4. Store management:
   - Settings, branding, business hours, active/inactive status.
5. Catalog and orders:
   - Product CRUD, variants/SKU, inventory tracking, bulk import/export.
   - Order detail timeline, internal notes, cancel/refund, export.
6. Customers:
   - Customer list, history, and search.

### P2 (medium, growth features)
1. Analytics:
   - Revenue charts, product performance, conversion funnel, exports (CSV).
2. Marketing:
   - Coupons, campaigns, banners, segmentation, A/B testing.
3. Communication:
   - Notifications center, templates, scheduling, webhook status monitor.
4. Finance:
   - Transactions, reconciliation, payouts, disputes, refunds.
5. Security/admin:
   - Roles/permissions and audit logs.

### P3 (later)
- Theme toggle (full light/dark).
- Drag-and-drop widgets and auto-save.
- Advanced keyboard shortcuts and print views.

## Endpoint coverage map (to verify)

### From AGENTS.md (dashboard in use)
- Base URL: `/api/v1/`
- Stores and multi-tenant:
  - `/stores/`, `/stores/orders/`, `/stores/products/`, `/stores/categories/`,
    `/stores/coupons/`, `/stores/customers/`, `/stores/reports/`
- Marketing and communication:
  - `/marketing/`, `/whatsapp/`, `/conversations/`, `/langflow/`

### From API_ENDPOINTS.md (generic list)
- Base URL: `/api/`
- User/auth:
  - `/users/register/`, `/users/profile/`
  - Auth via `Authorization: Token ...`
- Catalog and orders:
  - `/products/`, `/products/categories/`, `/orders/`, `/orders/{id}/update_status/`
- Cart/checkout:
  - `/cart/*`, `/checkout/*`
- Webhooks:
  - `/webhooks/mercado_pago/`

## Mismatches to confirm with backend
1. Base URL: `/api/v1/` vs `/api/` (choose one).
2. Auth: httpOnly cookie JWT vs `Authorization: Token` header.
3. Store scoping: `/stores/*` vs global `/products` and `/orders`.
4. Admin dashboard scope:
   - Are `/cart` and `/checkout` for storefront only?
5. Status enums:
   - Confirm order and payment status values for UI mappings.

## Definition of done
- All pages use a single API client and typed services.
- No duplicated or legacy pages in navigation or routing.
- Orders and Products pages use the same data model and services.
- Store switching is consistent across all pages and requests.
- UX includes empty states, loading skeletons, and clear error states.
