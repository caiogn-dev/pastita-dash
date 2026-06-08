/**
 * Comprehensive tests for ComboModal real-time validation
 *
 * Tests:
 * - Required group validation
 * - Min/max selection validation
 * - Variant limit validation
 * - Stock availability validation
 * - Duplicate variant prevention
 * - Error message display
 * - Checkbox disable states
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ComboModal } from '../components/Combos';
import type { StoreCombo } from '../services/storesApi';

// Mock Modal component to simplify testing
jest.mock('../components/common', () => ({
  ...jest.requireActual('../components/common'),
  Modal: ({ isOpen, children, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
      </div>
    ) : null,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test Data Builders
// ─────────────────────────────────────────────────────────────────────────────

const createMockVariantLimit = (id: string, name: string, stock: number, maxSelections: number = 1) => ({
  id,
  variant_id: id,
  variant_name: name,
  variant_sku: `SKU-${name}`,
  stock,
  max_selections: maxSelections,
  price_override: null,
});

const createMockGroup = (
  id: string,
  productName: string,
  isRequired: boolean = true,
  minSelections: number = 1,
  maxSelections: number = 1,
  allowDuplicates: boolean = false,
  variants: any[] = []
) => ({
  id,
  product_id: `prod-${id}`,
  product_name: productName,
  is_required: isRequired,
  min_selections: minSelections,
  max_selections: maxSelections,
  allow_duplicate_variants: allowDuplicates,
  position: 0,
  variant_limits: variants,
});

const createMockCombo = (groups: any[]): StoreCombo => ({
  id: 'combo-1',
  store: 'store-1',
  name: 'Test Combo',
  slug: 'test-combo',
  price: 50.0,
  compare_at_price: 65.0,
  description: 'Test combo description',
  image_url: 'https://example.com/combo.jpg',
  is_active: true,
  featured: false,
  track_stock: false,
  stock_quantity: 0,
  items: [],
  groups,
  savings: 15.0,
  savings_percentage: 23,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

// ─────────────────────────────────────────────────────────────────────────────
// Required Group Validation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Required Group Validation', () => {
  it('shows error when required group has no selections', async () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Check that error appears in error box (validation runs on mount)
    await waitFor(() => {
      expect(screen.getByText(/Grupo 'Rondelli' é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('clears error when required group selection is made', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Verify error exists initially
    await waitFor(() => {
      expect(screen.getByText(/Grupo 'Rondelli' é obrigatório/i)).toBeInTheDocument();
    });

    // Select a variant
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Grupo 'Rondelli' é obrigatório/i)).not.toBeInTheDocument();
    });
  });

  it('validates multiple required groups', async () => {
    const variants1 = [createMockVariantLimit('var-1', 'Frango', 10)];
    const variants2 = [createMockVariantLimit('var-2', 'Vinagrete', 10)];
    const groups = [
      createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants1),
      createMockGroup('group-2', 'Molho', true, 1, 1, false, variants2),
    ];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Both groups should show errors
    await waitFor(() => {
      expect(screen.getByText(/Grupo 'Rondelli' é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Grupo 'Molho' é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('allows optional groups to be empty', async () => {
    const variants = [createMockVariantLimit('var-1', 'Frango', 10)];
    const groups = [createMockGroup('group-1', 'Rondelli', false, 0, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // No error should appear for optional group
    await waitFor(() => {
      expect(screen.queryByText(/é obrigatório/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Min/Max Selections Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Min/Max Selections Validation', () => {
  it('shows error when minimum selections not met', async () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
      createMockVariantLimit('var-3', 'Vegetariano', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 2, 3, false, variants)];
    const combo = createMockCombo(groups);

    const user = userEvent.setup();
    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Select only 1 variant
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Should show min error
    await waitFor(() => {
      expect(screen.getByText(/selecione no mínimo 2 item/i)).toBeInTheDocument();
    });
  });

  it('clears error when minimum selections met', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
      createMockVariantLimit('var-3', 'Vegetariano', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 2, 3, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Select 2 variants
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Error should clear
    await waitFor(() => {
      expect(screen.queryByText(/selecione no mínimo 2 item/i)).not.toBeInTheDocument();
    });
  });

  it('shows error when maximum selections exceeded', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
      createMockVariantLimit('var-3', 'Vegetariano', 10),
    ];
    // allowDuplicates=true: group max is soft-enforced (error shown, not blocked)
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Select 3 variants (exceeds soft max of 2)
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    // Should show max error
    await waitFor(() => {
      expect(screen.getByText(/selecione no máximo 2 item/i)).toBeInTheDocument();
    });
  });

  it('disables additional checkboxes when max selections reached', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
      createMockVariantLimit('var-3', 'Vegetariano', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select 2 variants (at max)
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Third checkbox should be disabled
    expect(checkboxes[2]).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Variant Limit Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Variant Limit Validation', () => {
  it('shows error when variant limit exceeded', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 2),
      createMockVariantLimit('var-2', 'Carne', 10, 1),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 4, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select Frango 3 times (exceeds limit of 2)
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText(/no máximo 2 seleção/i)).toBeInTheDocument();
    });
  });

  it('disables variant checkbox when variant limit reached', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 1),
      createMockVariantLimit('var-2', 'Carne', 10, 1),
    ];
    // allowDuplicates=false: variant limit is hard-enforced (checkbox disabled)
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select Frango once (reaches its limit of 1)
    await user.click(checkboxes[0]);

    // Frango checkbox should now be disabled (hard variant limit enforced)
    await waitFor(() => {
      expect(checkboxes[0]).toBeDisabled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stock Availability Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Stock Validation', () => {
  it('disables variant when stock is zero', async () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 0), // No stock
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // First checkbox (Frango with 0 stock) should be disabled
    expect(checkboxes[0]).toBeDisabled();
    // Second checkbox should be enabled
    expect(checkboxes[1]).not.toBeDisabled();

    // Error message should show
    expect(screen.getByText(/Sem estoque/i)).toBeInTheDocument();
  });

  it('shows error when stock insufficient for selection count', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 2, 5),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 5, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Try to select 3 times (but stock is only 2)
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText(/estoque insuficiente/i)).toBeInTheDocument();
    });
  });

  it('shows stock info in variant label', () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 15),
      createMockVariantLimit('var-2', 'Carne', 5),
      createMockVariantLimit('var-3', 'Vegetariano', 0),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 3, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Stock info should be displayed
    expect(screen.getByText(/Estoque: 15/)).toBeInTheDocument();
    expect(screen.getByText(/Estoque: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Sem estoque/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Variant Prevention Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Duplicate Prevention', () => {
  it('prevents duplicates when not allowed', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 2), // max_selections=2 so first click doesn't disable
      createMockVariantLimit('var-2', 'Carne', 10, 2),
    ];
    // allowDuplicates=false: clicking selected variant deselects it (toggle), not duplicates
    const groups = [createMockGroup('group-1', 'Rondelli', true, 2, 2, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select var-1, then click again — toggle removes it instead of duplicating
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);

    // No duplicate error since toggle deselected the item
    await waitFor(() => {
      expect(screen.queryByText(/não é permitido selecionar variantes duplicadas/i)).not.toBeInTheDocument();
    });

    // Checkbox should be unchecked (deselected, not duplicated)
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('allows duplicates when allowed', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 2, 2, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select same variant twice
    await user.click(checkboxes[0]);
    await user.click(checkboxes[0]);

    // Should NOT show duplicate error
    await waitFor(() => {
      expect(screen.queryByText(/não é permitido selecionar variantes duplicadas/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Display Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Error Display', () => {
  it('displays all validation errors together', async () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 1),
    ];
    const groups = [
      createMockGroup('group-1', 'Rondelli', true, 2, 2, false, variants),
      createMockGroup('group-2', 'Molho', true, 1, 1, false, [
        createMockVariantLimit('var-2', 'Vinagrete', 0),
      ]),
    ];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Should show multiple errors
    await waitFor(() => {
      expect(screen.getByText(/Grupo 'Rondelli' é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Grupo 'Molho' é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Sem estoque/i)).toBeInTheDocument();
    });
  });

  it('clears errors when all validations pass', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    // Check error exists
    await waitFor(() => {
      expect(screen.getByText(/é obrigatório/i)).toBeInTheDocument();
    });

    // Select a variant
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByText(/é obrigatório|selecione no mínimo|selecione no máximo/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Add to Cart Button Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Add to Cart Button', () => {
  it('disables button when validation errors exist', async () => {
    const variants = [createMockVariantLimit('var-1', 'Frango', 10)];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const addButton = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });

    // Button should be disabled due to missing selection
    await waitFor(() => {
      expect(addButton).toBeDisabled();
    });
  });

  it('enables button when all validations pass', async () => {
    const user = userEvent.setup();
    const variants = [createMockVariantLimit('var-1', 'Frango', 10)];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const addButton = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });

    // Select variant
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Button should be enabled
    await waitFor(() => {
      expect(addButton).not.toBeDisabled();
    });
  });
});
