// src/components/orders/__tests__/NewOrderDrawer.smoke.test.tsx
import { render, screen } from '@testing-library/react';
jest.mock('../../crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../services/api', () => ({ __esModule: true, getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro') }));

import { NewOrderDrawer } from '../NewOrderDrawer';

test('renders step 1 (Cliente) with progress when open', () => {
  render(<NewOrderDrawer isOpen storeSlug="loja-1" storeId="uuid-1" onClose={() => {}} />);
  expect(screen.getByText(/Novo Pedido/i)).toBeInTheDocument();
  expect(screen.getByText(/Passo 1 de 5/i)).toBeInTheDocument();
  expect(screen.getByTestId('customer-search')).toBeInTheDocument();
});

test('renders nothing when closed', () => {
  const { container } = render(<NewOrderDrawer isOpen={false} storeSlug="loja-1" onClose={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
