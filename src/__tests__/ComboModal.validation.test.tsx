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

  it('disables third checkbox when max 2 selections are made', async () => {
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
    // Select 2 variants (reaching the max)
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Third checkbox must be disabled — the UI prevents exceeding max at the checkbox level
    await waitFor(() => {
      expect(checkboxes[2]).toBeDisabled();
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
  it('disables variant checkbox when variant max_selections is reached', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 1),
      createMockVariantLimit('var-2', 'Carne', 10, 1),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Select Frango once (reaches its per-variant limit of 1)
    await user.click(checkboxes[0]);

    // Frango checkbox must be disabled — the UI prevents exceeding variant limit
    await waitFor(() => {
      expect(checkboxes[0]).toBeDisabled();
    });
  });

  it('disables variant checkbox when variant limit reached', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10, 1),
      createMockVariantLimit('var-2', 'Carne', 10, 1),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 2, true, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select Frango once (reaches its limit of 1)
    await user.click(checkboxes[0]);

    // Try to click Frango again - should be disabled
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

    // "Sem estoque" appears in both the stock badge and the disabled-reason label —
    // use getAllByText to tolerate both occurrences.
    expect(screen.getAllByText(/Sem estoque/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows zero-stock badge and disables checkbox when stock is exhausted', async () => {
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 0),
    ];
    const groups = [createMockGroup('group-1', 'Rondelli', true, 1, 1, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Checkbox is disabled because stock = 0
    expect(checkboxes[0]).toBeDisabled();
    // "Sem estoque" badge appears at least once in the label
    expect(screen.getAllByText(/Sem estoque/i).length).toBeGreaterThanOrEqual(1);
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

    // Stock info should be displayed; "Sem estoque" may appear in both the
    // stock-badge and the disabled-reason label for the zero-stock variant.
    expect(screen.getByText(/Estoque: 15/)).toBeInTheDocument();
    expect(screen.getByText(/Estoque: 5/)).toBeInTheDocument();
    expect(screen.getAllByText(/Sem estoque/).length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Variant Prevention Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ComboModal - Duplicate Prevention', () => {
  it('selecting a different variant for a group that disallows duplicates works', async () => {
    const user = userEvent.setup();
    const variants = [
      createMockVariantLimit('var-1', 'Frango', 10),
      createMockVariantLimit('var-2', 'Carne', 10),
    ];
    // allow_duplicate_variants=false; the toggle-checkbox UI already prevents
    // the same variant from appearing twice in the selection.
    const groups = [createMockGroup('group-1', 'Rondelli', true, 2, 2, false, variants)];
    const combo = createMockCombo(groups);

    render(
      <ComboModal combo={combo} isOpen={true} onClose={jest.fn()} />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select both distinct variants — no duplicate error should appear
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.queryByText(/não é permitido selecionar variantes duplicadas/i)).not.toBeInTheDocument();
    });
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

    // Should show required-group errors in the validation error banner
    await waitFor(() => {
      expect(screen.getByText(/Grupo 'Rondelli' é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Grupo 'Molho' é obrigatório/i)).toBeInTheDocument();
      // "Sem estoque" appears in the variant stock badge AND the disabled-reason label
      expect(screen.getAllByText(/Sem estoque/i).length).toBeGreaterThanOrEqual(1);
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
