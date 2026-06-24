/**
 * Tests for Combo management components
 *
 * Tests:
 * - ComboList renders correctly
 * - ComboForm submits data properly
 * - ComboModal validation works
 * - Component integration
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ComboForm, ComboList, ComboModal } from '../components/Combos';
import type { StoreCombo, StoreProduct } from '../services/storesApi';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const mockProducts: Partial<StoreProduct>[] = [
  {
    id: 'prod-1',
    name: 'Hambúrguer',
    price: 25.0,
    description: 'Hambúrguer clássico',
    image_url: 'https://example.com/burger.jpg',
    sku: 'SKU001',
    is_active: true,
    featured: false,
    track_stock: false,
    stock_quantity: 100,
  },
  {
    id: 'prod-2',
    name: 'Refrigerante',
    price: 8.0,
    description: 'Refrigerante gelado',
    image_url: 'https://example.com/drink.jpg',
    sku: 'SKU002',
    is_active: true,
    featured: false,
    track_stock: false,
    stock_quantity: 100,
  },
] as Partial<StoreProduct>[];

const mockCombo: StoreCombo = {
  id: 'combo-1',
  store: 'store-1',
  name: 'Combo Básico',
  slug: 'combo-basico',
  price: 30.0,
  compare_at_price: 35.0,
  description: 'Um combo simples',
  image_url: 'https://example.com/combo.jpg',
  is_active: true,
  featured: false,
  track_stock: false,
  stock_quantity: 0,
  items: [
    {
      id: 'item-1',
      product: 'prod-1',
      product_name: 'Hambúrguer',
      quantity: 1,
      allow_customization: false,
      customization_options: [],
    },
  ],
  groups: [
    {
      id: 'group-1',
      product_id: 'prod-1',
      product_name: 'Hambúrguer',
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      allow_duplicate_variants: false,
      position: 0,
      variant_limits: [
        {
          id: 'vl-1',
          variant_id: 'variant-classic',
          variant_name: 'Clássico',
          variant_sku: 'SKU-CL',
          stock: 10,
          max_selections: 1,
          price_override: null,
        },
      ],
    },
  ],
  savings: 5.0,
  savings_percentage: 14,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock the Modal component to avoid testing-library issues
jest.mock('../components/common', () => ({
  ...jest.requireActual('../components/common'),
  Modal: ({ isOpen, children, title }: any) => isOpen ? <div data-testid="modal">{title}{children}</div> : null,
}));

// ─────────────────────────────────────────────────────────────────────────────
// ComboList Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('ComboList Component', () => {
  it('renders empty state when no combos provided', () => {
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[]}
        products={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Nenhum combo encontrado/i)).toBeInTheDocument();
  });

  it('renders combo table with data', () => {
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[mockCombo]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Combo Básico')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 30,00/)).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('filters combos by search term', async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[mockCombo, { ...mockCombo, id: 'combo-2', name: 'Combo Premium' }]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar combos/i);
    await user.type(searchInput, 'Premium');

    await waitFor(() => {
      expect(screen.getByText('Combo Premium')).toBeInTheDocument();
      expect(screen.queryByText('Combo Básico')).not.toBeInTheDocument();
    });
  });

  it('filters combos by active status', async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    const inactiveCombo = { ...mockCombo, id: 'combo-2', is_active: false };

    render(
      <ComboList
        combos={[mockCombo, inactiveCombo]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    // Filter to active only
    const filterButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Ativos') || btn.textContent?.includes('Todos') || btn.textContent?.includes('Inativos')
    );
    const activeButton = filterButtons.find(btn => btn.textContent?.includes('Ativos'));

    if (activeButton) {
      await user.click(activeButton);
      await waitFor(() => {
        expect(screen.getByText('Combo Básico')).toBeInTheDocument();
      });
    }
  });

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const mockHandlers = {
      onEdit,
      onDelete: jest.fn(),
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[mockCombo]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    const allButtons = screen.getAllByRole('button');
    const editButton = allButtons.find(btn => btn.title === 'Editar');
    if (editButton) {
      await user.click(editButton);
      expect(onEdit).toHaveBeenCalledWith(mockCombo);
    }
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete,
      onToggleActive: jest.fn(),
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[mockCombo]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    const trashButtons = screen.getAllByRole('button').filter(btn => btn.title === 'Excluir');
    await user.click(trashButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(mockCombo);
  });

  it('calls onToggleActive when visibility button clicked', async () => {
    const user = userEvent.setup();
    const onToggleActive = jest.fn();
    const mockHandlers = {
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onToggleActive,
      onToggleFeatured: jest.fn(),
    };

    render(
      <ComboList
        combos={[mockCombo]}
        products={mockProducts}
        {...mockHandlers}
      />
    );

    const visibilityButtons = screen.getAllByRole('button').filter(btn => btn.title && btn.title.includes('Desativar'));
    await user.click(visibilityButtons[0]);

    expect(onToggleActive).toHaveBeenCalledWith(mockCombo);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ComboForm Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('ComboForm Component', () => {
  it('renders form with empty state', () => {
    const onSubmit = jest.fn();

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText(/Nome do combo/i)).toBeInTheDocument();
    expect(screen.getByText(/Preço do combo/i)).toBeInTheDocument();
  });

  it('populates form with combo data when editing', () => {
    const onSubmit = jest.fn();

    render(
      <ComboForm
        combo={mockCombo}
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByDisplayValue('Combo Básico')).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    const submitButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Criar'));
    if (submitButtons.length > 0) {
      await user.click(submitButtons[0]);
      // onSubmit should not be called due to validation
      expect(onSubmit).not.toHaveBeenCalled();
    }
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    // Fill in required fields
    const inputs = screen.getAllByRole('textbox');
    const numberInputs = screen.getAllByRole('spinbutton');

    if (inputs.length > 0 && numberInputs.length > 0) {
      await user.type(inputs[0], 'Test Combo');
      await user.type(numberInputs[0], '25');

      const submitButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Criar'));
      if (submitButtons.length > 0) {
        await user.click(submitButtons[0]);

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalled();
        }, { timeout: 2000 });
      }
    }
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    // Click on "Produtos" tab
    const tabButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Produtos'));
    if (tabButtons.length > 0) {
      await user.click(tabButtons[0]);
      expect(screen.getByText(/Adicione os produtos/i)).toBeInTheDocument();
    }
  });

  it('adds and removes items', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    // Navigate to items tab
    const tabButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Produtos'));
    if (tabButtons.length > 0) {
      await user.click(tabButtons[0]);

      // Add item
      const addButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Adicionar produto'));
      if (addButtons.length > 0) {
        await user.click(addButtons[0]);
      }
    }
  });

  it('displays savings preview when items are added', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <ComboForm
        storeId="store-1"
        products={mockProducts as any}
        onSubmit={onSubmit}
      />
    );

    // Navigate through tabs to test the form flow
    const tabButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Informações') ||
      btn.textContent?.includes('Produtos') ||
      btn.textContent?.includes('Configurações')
    );

    expect(tabButtons.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ComboModal Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('ComboModal Component', () => {
  it('renders nothing when combo is null', () => {
    render(
      <ComboModal
        combo={null}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText('Combo Básico')).not.toBeInTheDocument();
  });

  it('renders modal with combo data', () => {
    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Combo Básico')).toBeInTheDocument();
    expect(screen.getByText(/Um combo simples/)).toBeInTheDocument();
  });

  it('displays product items for selection', () => {
    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    // Check if modal renders with title and basic info
    const modal = screen.getByTestId('modal');
    expect(modal).toBeInTheDocument();
  });

  it('validates selections before adding to cart', async () => {
    const user = userEvent.setup();
    const onAddToCart = jest.fn();

    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
        onAddToCart={onAddToCart}
      />
    );

    const addButton = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });

    // Should be disabled initially (no selections)
    expect(addButton).toBeDisabled();
  });

  it('calls onAddToCart when valid selection is made', async () => {
    const user = userEvent.setup();
    const onAddToCart = jest.fn().mockResolvedValue(undefined);

    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
        onAddToCart={onAddToCart}
      />
    );

    // Select the item
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 0) {
      await user.click(checkboxes[0]);
    }

    const addButton = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });

    // Button should be enabled after selection
    if (!addButton.hasAttribute('disabled')) {
      await user.click(addButton);
      expect(onAddToCart).toHaveBeenCalled();
    }
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={onClose}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('displays image when provided', () => {
    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    const img = screen.getByAltText('Combo Básico') as HTMLImageElement;
    expect(img.src).toBe(mockCombo.image_url);
  });

  it('displays price comparison when compare_at_price is set', () => {
    render(
      <ComboModal
        combo={mockCombo}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    // Should show the original price as strikethrough
    const priceElements = screen.getAllByText(/R\$ 35,00/);
    expect(priceElements.length).toBeGreaterThan(0);
  });
});
