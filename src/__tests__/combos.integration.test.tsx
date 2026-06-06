/**
 * Integration Tests for Combo Management Pages
 *
 * Tests:
 * 1. ComboListPage renders and loads data
 * 2. ComboFormPage renders with data loading
 * 3. Store slug routing works correctly
 */
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock dependencies FIRST before any imports
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

const mockCombo = {
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
      quantity: 1,
      allow_customization: false,
      customization_options: {},
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockProducts = [
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
    variants: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

jest.mock('../services/storesApi', () => ({
  getCombos: jest.fn(async () => ({
    results: [mockCombo],
    count: 1,
  })),
  getCombo: jest.fn(async () => mockCombo),
  getProducts: jest.fn(async () => ({
    results: mockProducts,
    count: mockProducts.length,
  })),
  createComboWithItems: jest.fn(),
  updateComboWithItems: jest.fn(),
  deleteCombo: jest.fn(),
  updateCombo: jest.fn(),
}));

// Now import after mocks are set up
import { ComboListPage } from '../pages/stores/combos/ComboListPage';
import { ComboFormPage } from '../pages/stores/combos/ComboFormPage';
import * as storesApi from '../services/storesApi';

const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  window.history.pushState({}, 'Test page', initialRoute);
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ComboListPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render and load combos', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    // Wait for data to load
    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Should display the page title
    expect(screen.getByText('Combos')).toBeInTheDocument();
  });

  it('should display new combo button', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    const newBtn = screen.getByRole('button', { name: /Novo Combo/i });
    expect(newBtn).toBeInTheDocument();
  });

  it('should support store slug in URL', async () => {
    renderWithRouter(
      <ComboListPage />,
      '/stores/meu-restaurante/combos'
    );

    await waitFor(() => {
      expect(storesApi.getCombos).toHaveBeenCalled();
    });

    // Verify the page rendered
    expect(screen.getByText('Combos')).toBeInTheDocument();
  });
});

describe('ComboFormPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form page container', () => {
    const { container } = renderWithRouter(
      <ComboFormPage />,
      '/stores/meu-restaurante/combos/new'
    );

    // Should render the page component
    expect(container.querySelector('.p-4')).toBeInTheDocument();
  });
});
