import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock heavy dependencies before importing the component
// api.ts usa import.meta.env (Vite-only); mockar aqui evita que o módulo seja
// avaliado pelo ts-jest (CommonJS) sem o transform jestViteEnvTransform.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../services/storesApi');
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'l1', storeSlug: 'l1' }),
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

beforeEach(() => {
  jest.clearAllMocks();
  (storesApi.createCustomer as jest.Mock).mockResolvedValue({});
  (storesApi.updateCustomer as jest.Mock).mockResolvedValue({});
});

it('cria cliente com endereço', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Maria' } });
  fireEvent.change(screen.getByLabelText(/rua/i), { target: { value: 'Rua A' } });
  fireEvent.change(screen.getByLabelText(/número/i), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(storesApi.createCustomer).toHaveBeenCalledWith(
    'l1', expect.objectContaining({
      name: 'Maria',
      address_list: [expect.objectContaining({ street: 'Rua A', number: '10', is_default: true })],
    }),
  ));
});

it('não envia address_list quando endereço está vazio', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'João' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const payload = (storesApi.createCustomer as jest.Mock).mock.calls[0][1];
    expect(payload.address_list).toBeUndefined();
  });
});
