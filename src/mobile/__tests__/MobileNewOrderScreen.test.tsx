// src/mobile/__tests__/MobileNewOrderScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';

const navigate = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => navigate }));
jest.mock('../../components/crm/CustomerSearchInput', () => ({ CustomerSearchInput: () => <div data-testid="customer-search" /> }));
jest.mock('../../services/orders', () => ({ ordersService: { calculateDeliveryFee: jest.fn(), createOrder: jest.fn() } }));
jest.mock('../../services/products', () => ({ productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) } }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../services/api', () => ({ __esModule: true, getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'Erro') }));

import { useRootStore } from '../../stores/rootStore';
import { MobileNewOrderScreen } from '../screens/MobileNewOrderScreen';

beforeEach(() => {
  navigate.mockClear();
  useRootStore.setState({ selectedStoreId: 's1', stores: [{ id: 's1', name: 'Loja 1', slug: 'loja-1' }] } as never);
});

test('starts on step 1 (Cliente) with progress and X', () => {
  render(<MobileNewOrderScreen />);
  expect(screen.getByText(/Passo 1 de 5/i)).toBeInTheDocument();
  expect(screen.getByTestId('customer-search')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pr.ximo/i })).toBeDisabled(); // no customer yet
});

test('X navigates back to the orders tab', () => {
  render(<MobileNewOrderScreen />);
  fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
  expect(navigate).toHaveBeenCalledWith('/?tab=pedidos');
});

test('shows placeholder when no store is selected', () => {
  useRootStore.setState({ selectedStoreId: null, stores: [] } as never);
  render(<MobileNewOrderScreen />);
  expect(screen.getByText(/selecione uma loja/i)).toBeInTheDocument();
});
