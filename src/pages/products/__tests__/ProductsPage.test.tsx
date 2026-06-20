import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductsPage } from '../ProductsPage';
import * as storesApi from '../../../services/storesApi';

jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getCategories: jest.fn(),
  getProducts: jest.fn(),
  getProductTypes: jest.fn(),
  updateCategory: jest.fn(),
  updateProduct: jest.fn(),
  updateProductStock: jest.fn(),
}));

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: undefined }),
  default: () => ({ storeId: undefined }),
}));

jest.mock('../ProductFormModal', () => ({
  __esModule: true,
  ProductFormModal: () => null,
}));

jest.mock('../../../hooks/useToast', () => ({
  __esModule: true,
  useToast: () => ({
    toasts: [],
    addToast: jest.fn(),
    removeToast: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }),
}));

beforeEach(() => {
  (storesApi.getCategories as any).mockResolvedValue([
    { id: 'a', name: 'Almoço', sort_order: 1, is_active: true },
  ]);
  (storesApi.getProducts as any).mockResolvedValue({
    results: [
      {
        id: 'p1',
        name: 'Arroz',
        price: 6.8,
        stock_quantity: 1,
        track_stock: false,
        status: 'active',
        category: 'a',
        sort_order: 0,
      },
    ],
  });
  (storesApi.getProductTypes as any).mockResolvedValue([]);
});

test('renders categories and products', async () => {
  render(<ProductsPage />);
  await waitFor(() => expect(screen.getAllByText('Almoço').length).toBeGreaterThan(0));
  expect(screen.getByText('Arroz')).toBeInTheDocument();
});
