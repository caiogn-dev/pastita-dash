import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock heavy dependencies before importing the component
jest.mock('../../../services/storesApi');
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../hooks/queries/useCustomers', () => ({
  useCustomers: () => ({ data: null, isLoading: false, isFetching: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../../../hooks/queries/useCustomerStats', () => ({
  useCustomerStats: () => ({ data: null, isFetching: false }),
}));
jest.mock('../../../hooks/queries/useCustomerOrders', () => ({
  useCustomerOrders: () => ({ data: null, isLoading: false, fetchStatus: 'idle' }),
}));
jest.mock('../../../utils/avatar', () => ({
  getAvatarColor: () => '#888',
  getInitials: () => 'MS',
}));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { CustomerFormDrawer } from '../CustomersPage';
import * as storesApi from '../../../services/storesApi';

test('novo cliente chama createCustomer com storeSlug+name+phone', async () => {
  (storesApi.createCustomer as jest.Mock).mockResolvedValue({ id: 'c1' });
  const onSaved = jest.fn();
  render(
    <CustomerFormDrawer storeSlug="loja-1" onClose={jest.fn()} onSaved={onSaved} />
  );
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Maria Souza' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '63999990000' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() =>
    expect(storesApi.createCustomer).toHaveBeenCalledWith(
      'loja-1',
      expect.objectContaining({ name: 'Maria Souza', phone: '63999990000' })
    )
  );
  expect(onSaved).toHaveBeenCalled();
});
