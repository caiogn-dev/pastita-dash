# Pastita Dash Revamp Plan

## Goals
- Align dashboard with current /stores API.
- Remove duplicate/legacy pages and services.
- Centralize data access and reduce drift.
- Improve UX clarity and consistency without breaking flows.

## P0 (critical)
- [ ] Consolidate orders to a single service (drop unifiedApi) and normalize data.
- [ ] Update Orders Kanban and Orders Page to use the same order model.
- [ ] Remove deprecated Pastita products page (legacy API) and point to the modern catalog UI.

## P1 (high)
- [ ] Remove duplicate/legacy pages (ProductsPage, OrderDetailPage).
- [ ] Remove deprecated services that are no longer used (pastitaApi, productsService, unifiedApi).
- [ ] Clean up service exports to reflect the new architecture.

## P2 (medium)
- [ ] UX polish: consistent money formatting, status handling, empty states and data-loading UX.
