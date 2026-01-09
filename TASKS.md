# Pastita Dashboard - Tasks

## ✅ Completed (2026-01-09)

### Payment Gateways Fix
- [x] Fixed 400 error on `/payments/gateways/` endpoint
- [x] Root cause: Router configuration conflict in backend
- [x] Solution: Separated payment and gateway routers in `apps/payments/urls.py`

## Pending Tasks

### High Priority 🔴
- [ ] Add gateway creation form
- [ ] Implement payment refund UI
- [ ] Add payment status filters

### Medium Priority 🟡
- [ ] Dashboard analytics charts
- [ ] Export functionality for payments
- [ ] Notification preferences

### Low Priority 🟢
- [ ] Dark mode support
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts

## API Endpoints Used

### Payments
- `GET /api/v1/payments/` - List payments
- `GET /api/v1/payments/{id}/` - Get payment details
- `POST /api/v1/payments/{id}/confirm/` - Confirm payment
- `POST /api/v1/payments/{id}/cancel/` - Cancel payment
- `POST /api/v1/payments/{id}/refund/` - Refund payment

### Payment Gateways
- `GET /api/v1/payments/gateways/` - List gateways ✅ Fixed
- `GET /api/v1/payments/gateways/{id}/` - Get gateway details
- `POST /api/v1/payments/gateways/` - Create gateway
- `PATCH /api/v1/payments/gateways/{id}/` - Update gateway
- `DELETE /api/v1/payments/gateways/{id}/` - Delete gateway

---
*Last updated: 2026-01-09*
