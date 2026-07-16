import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mesmas dependências pesadas mockadas em CustomerFormDrawer.test.tsx:
// api.ts usa import.meta.env (Vite-only) e os hooks de query batem na rede.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
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
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'MS' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { CustomerFormDrawer, CustomerDrawer } from '../CustomersPage';
import type { StoreCustomer } from '../../../services/storesApi';

// Acessibilidade: os botões de fechar (só ícone X) precisam de nome acessível,
// senão o leitor de tela anuncia apenas "button" e o usuário não sabe como sair
// do drawer. Regressão dos achados de a11y de 16/jul.

it('CustomerFormDrawer: o botão de fechar (ícone X) tem nome acessível e dispara onClose', () => {
  const onClose = jest.fn();
  render(<CustomerFormDrawer storeSlug="l1" onClose={onClose} onSaved={jest.fn()} />);
  const closeBtn = screen.getByRole('button', { name: /fechar/i });
  fireEvent.click(closeBtn);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('CustomerDrawer: o botão de fechar (ícone X) tem nome acessível e dispara onClose', () => {
  const onClose = jest.fn();
  const customer = {
    id: 1,
    user_name: 'Maria Silva',
    phone: '11999990000',
  } as unknown as StoreCustomer;
  render(<CustomerDrawer customer={customer} onClose={onClose} />);
  const closeBtn = screen.getByRole('button', { name: /fechar/i });
  fireEvent.click(closeBtn);
  expect(onClose).toHaveBeenCalledTimes(1);
});
