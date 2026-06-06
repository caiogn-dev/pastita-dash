# Combo Picker Modal — Real-Time Validation

## Overview

The Combo Picker Modal (`ComboModal`) implements comprehensive real-time validation for customer variant selections. As customers select product variants, the system validates their choices against:

1. **Required group validation** — Checks if required groups have selections
2. **Min/max selection counts** — Ensures selections fall within group limits
3. **Variant limits** — Enforces per-variant max selection rules
4. **Stock availability** — Disables variants with no stock, shows errors for insufficient stock
5. **Duplicate prevention** — Prevents duplicate variants when not allowed

## Features

### Real-Time Validation
- Validation runs on every checkbox change
- Error messages update instantly
- Users see live feedback as they select variants

### Error Display
- Validation errors displayed in a prominent error box at top of modal
- Error messages are clear and actionable in Portuguese
- All errors shown together for easy resolution

### Smart Checkbox States
- Checkboxes disabled when:
  - Variant stock = 0
  - Variant limit reached
  - Group max selections reached
- Disabled checkboxes show reason (e.g., "Sem estoque", "Limite atingido (2/2)")
- Visual feedback: disabled state has reduced opacity

### Selection Feedback
- Shows current selection count vs max for each group
- Displays variant stock information
- Shows per-variant max selections when > 1
- SKU displayed for variants (if available)

### Button State Management
- "Adicionar ao Carrinho" button disabled until all validations pass
- Button disabled during API call (isLoading state)
- Clear error messaging on failed submissions

## Data Flow

### 1. Modal Opens
```
Customer clicks combo
↓
ComboModal opens with combo data
↓
useComboValidation hook initialized
↓
Initial validation runs (shows missing required groups)
```

### 2. Customer Selects Variant
```
Customer clicks checkbox
↓
handleToggleVariant() checks if checkbox is enabled
↓
selectedVariants state updated
↓
useComboValidation runs validation
↓
errors and isValid state updated
↓
Component re-renders with new state
```

### 3. Validation Running
```
validateSelections(selections) called
↓
For each group:
  - Check if required and empty → error
  - Check selection count vs min/max → error
  - Check duplicates if not allowed → error
  - For each variant selected:
    - Check stock → error if 0 or insufficient
    - Check per-variant limit → error if exceeded
↓
Return errors array and isValid boolean
```

### 4. Customer Submits
```
Customer clicks "Adicionar ao Carrinho"
↓
Check isValid (must be true)
↓
Show loading state
↓
POST /api/v1/stores/{store_slug}/combos/add/ with selections
↓
Backend validates again (server-side validation)
↓
If valid: combo added to cart, modal closes
If invalid: show error toast with backend errors
```

## API Response Structure

The combo detail endpoint returns:

```json
{
  "id": "combo-uuid",
  "name": "Compre 3 Leve 4",
  "price": 45.00,
  "description": "4 Rondelli a preço especial",
  "image_url": "https://...",
  "groups": [
    {
      "id": "group-uuid",
      "product_id": "product-uuid",
      "product_name": "Rondelli",
      "is_required": true,
      "min_selections": 4,
      "max_selections": 4,
      "allow_duplicate_variants": true,
      "position": 0,
      "variant_limits": [
        {
          "id": "limit-uuid",
          "variant_id": "variant-uuid",
          "variant_name": "Frango",
          "variant_sku": "rondelli-frango",
          "stock": 15,
          "max_selections": 2,
          "price_override": null
        },
        ...
      ]
    },
    ...
  ]
}
```

## Validation Rules

### Required Groups
```typescript
if (group.is_required && selected.length === 0) {
  error: "Grupo 'Name' é obrigatório. Selecione pelo menos N item(ns)."
}
```

### Min/Max Selections Per Group
```typescript
if (selected.length > 0 && selected.length < group.min_selections) {
  error: "Grupo 'Name': selecione no mínimo N item(ns). Você selecionou M."
}

if (selected.length > group.max_selections) {
  error: "Grupo 'Name': selecione no máximo N item(ns). Você selecionou M."
}
```

### Duplicate Variants
```typescript
if (!group.allow_duplicate_variants && duplicates_found) {
  error: "Grupo 'Name': não é permitido selecionar variantes duplicadas. 
          Você selecionou múltiplas vezes: Frango, Carne."
}
```

### Variant Limits
```typescript
if (variant_count > variantLimit.max_selections) {
  error: "Variante 'Frango' em 'Name': no máximo N seleção(ões) permitida(s). 
          Você selecionou M."
}
```

### Stock Availability
```typescript
if (variantLimit.stock === 0) {
  disabled: true
  reason: "Sem estoque"
}

if (variant_count > variantLimit.stock) {
  error: "Variante 'Frango' em 'Name': estoque insuficiente. 
          Disponível: N, solicitado: M."
}
```

## Component API

### ComboModal Props

```typescript
interface ComboModalProps {
  combo: StoreCombo | null;           // Combo data with groups
  isOpen: boolean;                    // Modal visibility
  onClose: () => void;                // Close handler
  onAddToCart?: (
    combo: StoreCombo,
    selectedItems: Record<string, string[]>
  ) => Promise<void>;                 // Add to cart handler
  isLoading?: boolean;                // Loading state during submission
}
```

### useComboValidation Hook

```typescript
const { validateSelections, errors, isValid } = useComboValidation(combo);

// validateSelections(selections)
// - Accepts: Record<string, string[]> mapping group_id → variant_ids
// - Returns: { errors: string[], isValid: boolean }
// - Side effects: updates errors and isValid state
```

## Error Messages (Português)

All error messages are in Portuguese:

| Scenario | Message |
|----------|---------|
| Required group empty | `Grupo 'Name' é obrigatório. Selecione pelo menos N item(ns).` |
| Below minimum | `Grupo 'Name': selecione no mínimo N item(ns). Você selecionou M.` |
| Exceeds maximum | `Grupo 'Name': selecione no máximo N item(ns). Você selecionou M.` |
| Duplicates not allowed | `Grupo 'Name': não é permitido selecionar variantes duplicadas. Você selecionou múltiplas vezes: Frango, Carne.` |
| Variant limit exceeded | `Variante 'Frango' em 'Name': no máximo N seleção(ões) permitida(s). Você selecionou M.` |
| Stock zero | `Variante 'Frango' em 'Name': sem estoque disponível.` |
| Stock insufficient | `Variante 'Frango' em 'Name': estoque insuficiente. Disponível: N, solicitado: M.` |

## Testing

### Backend Tests (Django)
File: `apps/stores/tests/test_combo_modal_validation.py`

Test classes:
- `ModalRequiredGroupValidationTests` — Required group scenarios
- `ModalMinMaxSelectionValidationTests` — Min/max count scenarios
- `ModalVariantLimitValidationTests` — Variant limit scenarios
- `ModalStockValidationTests` — Stock availability scenarios
- `ModalDuplicateValidationTests` — Duplicate handling
- `ModalComplexScenarioTests` — Real-world multi-group scenarios

Run with:
```bash
make test-app APP=apps.stores
```

### Frontend Tests (Jest)
File: `src/__tests__/ComboModal.validation.test.tsx`

Test suites:
- `ComboModal - Required Group Validation`
- `ComboModal - Min/Max Selections Validation`
- `ComboModal - Variant Limit Validation`
- `ComboModal - Stock Validation`
- `ComboModal - Duplicate Prevention`
- `ComboModal - Error Display`
- `ComboModal - Add to Cart Button`

Test scenarios:
```
18 test cases covering:
  - Required group validation (4 tests)
  - Min/max selections (4 tests)
  - Variant limits (2 tests)
  - Stock availability (3 tests)
  - Duplicate prevention (2 tests)
  - Error display (2 tests)
  - Button state (1 test)
```

Run with:
```bash
npm test ComboModal.validation
```

## Implementation Checklist

### Frontend Implementation ✅
- [x] Update ComboModal component with real-time validation
- [x] Create useComboValidation hook
- [x] Display validation errors in error box
- [x] Disable checkboxes based on stock and variant limits
- [x] Show disabled reason ("Sem estoque", "Limite atingido")
- [x] Update button state based on validation
- [x] Add selection counter to groups
- [x] Display stock info for variants
- [x] Create comprehensive frontend tests

### Backend Support ✅
- [x] ComboSelectionValidator handles all validation rules
- [x] ComboDetailSerializer includes groups and variant limits
- [x] API endpoint returns complete group/variant data
- [x] AddComboToCartView validates server-side
- [x] Create comprehensive backend tests

### API Contract ✅
- [x] Update StoreCombo interface to include groups
- [x] Add ComboProductGroup interface
- [x] Add ComboVariantLimit interface
- [x] Document request/response format

## Known Limitations

1. **No real-time stock sync** — Stock is fetched once on modal open. If another customer purchases while modal is open, stock display won't update until modal reopens.

2. **No price overrides in modal** — Modal doesn't show `price_override` from variant limits. Plan to add in future iteration.

3. **Group ordering** — Groups always display in database order (position field). No custom UI ordering implemented yet.

## Future Enhancements

1. **WebSocket stock updates** — Real-time stock sync while modal is open
2. **Price display** — Show price overrides and total combo cost breakdown
3. **Variant search** — Filter/search variants in groups with many options
4. **Accessibility** — ARIA labels, keyboard navigation improvements
5. **Animations** — Smooth transitions when error states change
6. **Analytics** — Track which validation errors are most common

## Related Files

- **Frontend Components**: `/home/graco/WORK/pastita-dash/src/components/Combos/ComboModal.tsx`
- **Validation Hook**: `/home/graco/WORK/pastita-dash/src/hooks/useComboValidation.ts`
- **Frontend Tests**: `/home/graco/WORK/pastita-dash/src/__tests__/ComboModal.validation.test.tsx`
- **API Types**: `/home/graco/WORK/pastita-dash/src/services/storesApi.ts`
- **Backend Validator**: `/home/graco/WORK/server2/apps/stores/validators.py`
- **Backend Tests**: `/home/graco/WORK/server2/apps/stores/tests/test_combo_modal_validation.py`
- **Backend API**: `/home/graco/WORK/server2/apps/stores/api/views/combo_views.py`
- **Backend Serializer**: `/home/graco/WORK/server2/apps/stores/api/combo_serializers.py`
