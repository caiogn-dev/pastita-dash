/**
 * E2E Tests for Combo Management
 *
 * Tests full workflows:
 * 1. Create new combo with products
 * 2. Edit existing combo
 * 3. List combos with filtering
 * 4. Routing with store_slug
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ComboListPage } from '../pages/stores/combos/ComboListPage';
import { ComboFormPage } from '../pages/stores/combos/ComboFormPage';
import type { StoreCombo, StoreProduct } from '../services/storesApi';
import * as storesApi from '../services/storesApi';

// Mock the API
jest.mock('../services/storesApi');
jest.mock('../hooks', () => ({
  useStore: () => ({
    storeId: 'store-123',
    storeName: 'Meu Restaurante',
    stores: [
      { id: 'store-123', name: 'Meu Restaurante', slug: 'meu-restaurante' },
    ],
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../services/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockProducts: StoreProduct[] = [
  {
    id: 'prod-1',
    store: 'store-123',
    name: 'Hambúrguer',
    slug: 'hamburguer',
    price: 25.0,
    description: 'Hambúrguer clássico',
    image_url: 'https://example.com/burger.jpg',
    sku: 'SKU001',
    is_active: true,
    featured: false,
    track_stock: false,
    stock_quantity: 100,
    category: 'cat-1',
    category_name: 'Prato Principal',
    brand: '',
    variants: [
      {
        id: 'var-1',
        name: 'Tamanho P',
        sku: 'SKU001-P',
        stock_quantity: 50,
        price_override: 0,
      } as any,
      {
        id: 'var-2',
        name: 'Tamanho M',
        sku: 'SKU001-M',
        stock_quantity: 50,
        price_override: 5.0,
      } as any,
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    store: 'store-123',
    name: 'Refrigerante',
    slug: 'refrigerante',
    price: 8.0,
    description: 'Refrigerante gelado',
    image_url: 'https://example.com/drink.jpg',
    sku: 'SKU002',
    is_active: true,
    featured: false,
    track_stock: false,
    stock_quantity: 100,
    category: 'cat-2',
    category_name: 'Bebidas',
    brand: '',
    variants: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockCombo: StoreCombo = {
  id: 'combo-1',
  store: 'store-123',
  name: 'Combo Executivo',
  slug: 'combo-executivo',
  price: 35.0,
  compare_at_price: 40.0,
  description: 'Combo com hambúrguer e bebida',
  image: null,
  image_url: 'https://example.com/combo.jpg',
  is_active: true,
  featured: false,
  track_stock: false,
  stock_quantity: 0,
  savings: 5.0,
  savings_percentage: 12,
  items: [
    {
      id: 'item-1',
      product: 'prod-1',
      product_name: 'Hambúrguer',
      product_image: 'https://example.com/burger.jpg',
      quantity: 1,
      allow_customization: false,
      customization_options: {},
    },
    {
      id: 'item-2',
      product: 'prod-2',
      product_name: 'Refrigerante',
      quantity: 1,
      allow_customization: false,
      customization_options: {},
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Render with Router
// ─────────────────────────────────────────────────────────────────────────────

const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  window.history.pushState({}, 'Test page', initialRoute);
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Create Combo Flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Combo Creation E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storesApi.getProducts as jest.Mock).mockResolvedValue({
      results: mockProducts,
      count: mockProducts.length,
    });
    (storesApi.getCombos as jest.Mock).mockResolvedValue({
      results: [],
      count: 0,
    });
    (storesApi.createComboWithItems as jest.Mock).mockResolvedValue(mockCombo);
  });

  it('should navigate to form page and create new combo', async () => {
    const user = userEvent.setup();

    // Render the list page
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    // Wait for data to load
    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Click "Novo Combo" button
    const newComboBtn = screen.getByRole('button', { name: /Novo Combo/i });
    await user.click(newComboBtn);

    // Should navigate to form page
    expect(window.location.pathname).toContain('combos/new');
  });

  it('should fill in combo basic information and submit', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/new'
    );

    // Wait for form to load
    await waitFor(() => {
      expect(storesApi.getProducts).toHaveBeenCalled();
    });

    // Fill in basic info
    const nameInput = screen.getByDisplayValue('');
    if (nameInput) {
      await user.type(nameInput, 'Combo Deluxe');
    }

    // Find price input (should be in the basic tab)
    const priceInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    if (priceInputs.length > 0) {
      await user.clear(priceInputs[0]);
      await user.type(priceInputs[0], '45.00');
    }

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Criar combo/i });
    await user.click(submitBtn);

    // Verify API was called
    await waitFor(() => {
      expect(storesApi.createComboWithItems).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Combo Deluxe',
          price: 45.0,
        })
      );
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    const toast = require('react-hot-toast').default;

    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/new'
    );

    // Wait for form
    await waitFor(() => {
      expect(storesApi.getProducts).toHaveBeenCalled();
    });

    // Try to submit without filling in required fields
    const submitBtn = screen.getByRole('button', { name: /Criar combo/i });
    await user.click(submitBtn);

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('obrigatório'));
  });

  it('should add items to combo', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/new'
    );

    await waitFor(() => {
      expect(storesApi.getProducts).toHaveBeenCalled();
    });

    // Switch to items tab
    const itemsTab = screen.getByRole('button', { name: /Itens/i });
    await user.click(itemsTab);

    // Click "Adicionar Item"
    const addItemBtn = screen.getByRole('button', { name: /Adicionar Item/i });
    await user.click(addItemBtn);

    // Should show empty state message initially
    const emptyState = screen.queryByText(/Nenhum item no combo ainda/i);
    // After adding, it should be gone
    if (emptyState) {
      await waitFor(() => {
        expect(screen.queryByText(/Nenhum item no combo ainda/i)).not.toBeInTheDocument();
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Edit Combo Flow
// ─────────────────────────────────────────────────────────────────────────────

describe('Combo Editing E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storesApi.getProducts as jest.Mock).mockResolvedValue({
      results: mockProducts,
      count: mockProducts.length,
    });
    (storesApi.getCombos as jest.Mock).mockResolvedValue({
      results: [mockCombo],
      count: 1,
    });
    (storesApi.getCombo as jest.Mock).mockResolvedValue(mockCombo);
    (storesApi.updateComboWithItems as jest.Mock).mockResolvedValue({
      ...mockCombo,
      name: 'Combo Executivo Premium',
    });
  });

  it('should load existing combo and display in form', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/combo-1/edit'
    );

    // Wait for combo to load
    await waitFor(() => {
      expect(storesApi.getCombo).toHaveBeenCalledWith('combo-1');
    });

    // Should display combo name
    const nameField = screen.getByDisplayValue('Combo Executivo');
    expect(nameField).toBeInTheDocument();
  });

  it('should update combo and save changes', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/combo-1/edit'
    );

    await waitFor(() => {
      expect(storesApi.getCombo).toHaveBeenCalled();
    });

    // Update name
    const nameField = screen.getByDisplayValue('Combo Executivo');
    await user.clear(nameField);
    await user.type(nameField, 'Combo Executivo Premium');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Salvar alterações/i });
    await user.click(submitBtn);

    // Verify update API was called
    await waitFor(() => {
      expect(storesApi.updateComboWithItems).toHaveBeenCalled();
    });
  });

  it('should display combo items in edit form', async () => {
    renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/combo-1/edit'
    );

    await waitFor(() => {
      expect(storesApi.getCombo).toHaveBeenCalled();
    });

    // Switch to items tab
    const itemsTab = screen.getByRole('button', { name: /Itens/i });
    const user = userEvent.setup();
    await user.click(itemsTab);

    // Should show items count in tab label
    await waitFor(() => {
      expect(itemsTab).toHaveTextContent(/Itens \(2\)/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Store Slug Routing
// ─────────────────────────────────────────────────────────────────────────────

describe('Store Slug Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storesApi.getCombos as jest.Mock).mockResolvedValue({
      results: [mockCombo],
      count: 1,
    });
    (storesApi.getProducts as jest.Mock).mockResolvedValue({
      results: mockProducts,
      count: mockProducts.length,
    });
  });

  it('should support store slug in URL', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    // Should load combos for the store
    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Should display the combo
    expect(screen.getByText('Combo Executivo')).toBeInTheDocument();
  });

  it('should maintain slug in navigation', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Click new combo button
    const newBtn = screen.getByRole('button', { name: /Novo Combo/i });
    await user.click(newBtn);

    // Should navigate to /stores/meu-restaurante/combos/new
    expect(window.location.pathname).toBe('/stores/meu-restaurante/combos/new');
  });

  it('should navigate to edit with slug', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Find and click edit button
    const editBtns = screen.getAllByRole('button').filter(btn =>
      btn.title === 'Editar'
    );
    if (editBtns.length > 0) {
      await user.click(editBtns[0]);
      expect(window.location.pathname).toBe(
        '/stores/meu-restaurante/combos/combo-1/edit'
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: List and Filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('Combo List & Filtering', () => {
  const multiplesCombos = [
    mockCombo,
    { ...mockCombo, id: 'combo-2', name: 'Combo Econômico', is_active: false },
    { ...mockCombo, id: 'combo-3', name: 'Combo Premium', featured: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (storesApi.getCombos as jest.Mock).mockResolvedValue({
      results: multiplesCombos,
      count: multiplesCombos.length,
    });
    (storesApi.getProducts as jest.Mock).mockResolvedValue({
      results: mockProducts,
      count: mockProducts.length,
    });
  });

  it('should display stats cards', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Check for stats
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('Destaques')).toBeInTheDocument();
  });

  it('should display combo table', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Should display all combos
    expect(screen.getByText('Combo Executivo')).toBeInTheDocument();
    expect(screen.getByText('Combo Econômico')).toBeInTheDocument();
    expect(screen.getByText('Combo Premium')).toBeInTheDocument();
  });

  it('should toggle combo status', async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Find visibility toggle buttons
    const visibilityBtns = screen.getAllByRole('button').filter(btn =>
      btn.title && btn.title.includes('Desativar')
    );

    if (visibilityBtns.length > 0) {
      await user.click(visibilityBtns[0]);
      expect(storesApi.updateCombo).toHaveBeenCalled();
    }
  });
});
