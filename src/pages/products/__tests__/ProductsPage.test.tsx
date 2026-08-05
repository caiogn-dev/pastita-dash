import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsPage } from '../ProductsPage';
import * as storesApi from '../../../services/storesApi';

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductsPage />
    </QueryClientProvider>,
  );
};

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
  useStore: () => ({ storeId: 'store-1' }),
  default: () => ({ storeId: 'store-1' }),
}));

jest.mock('../ProductFormModal', () => ({
  __esModule: true,
  ProductFormModal: () => null,
}));

// A página usava useToast, cujos toasts iam para um useState local que ninguém
// renderizava (o ToastProvider nunca era montado) — os 8 caminhos de erro eram
// mudos. Agora usa react-hot-toast, que tem <Toaster/> montado em main.tsx.
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
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
  renderPage();
  await waitFor(() => expect(screen.getAllByText('Almoço').length).toBeGreaterThan(0));
  expect(screen.getByText('Arroz')).toBeInTheDocument();
});
