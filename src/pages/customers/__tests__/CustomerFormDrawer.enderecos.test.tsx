/**
 * Editar cliente NÃO pode apagar os outros endereços dele.
 *
 * `StoreCustomerSerializer._sync_address_list` é replace-all: apaga todo
 * endereço ausente do payload. O formulário só sabia montar `address_list[0]`,
 * então salvar uma correção de nome deletava os demais — 22 dos 85 clientes da
 * Cê Saladas (26 na base inteira) têm 2 ou mais.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

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
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'AN' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { CustomerFormDrawer } from '../CustomersPage';
import * as storesApi from '../../../services/storesApi';

const CLIENTE_COM_3_ENDERECOS = {
  id: 'c1',
  user_name: 'Aline Nasche',
  phone: '5511975373744',
  whatsapp: '5511975373744',
  notes: '',
  address_list: [
    { id: 'a1', street: 'Rua Padrão', number: '10', neighborhood: 'Centro', city: 'Palmas', state: 'TO', zip_code: '77000000', is_default: true },
    { id: 'a2', street: 'Rua do Trabalho', number: '20', neighborhood: 'Plano', city: 'Palmas', state: 'TO', zip_code: '77001000', is_default: false },
    { id: 'a3', street: 'Casa da Mãe', number: '30', neighborhood: 'Taquari', city: 'Palmas', state: 'TO', zip_code: '77002000', is_default: false },
  ],
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  (storesApi.updateCustomer as jest.Mock).mockResolvedValue({});
});

it('preserva os outros endereços ao salvar uma edição de nome', async () => {
  render(
    <CustomerFormDrawer customer={CLIENTE_COM_3_ENDERECOS} storeSlug="l1"
      onClose={jest.fn()} onSaved={jest.fn()} />,
  );
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Aline N.' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

  await waitFor(() => expect(storesApi.updateCustomer).toHaveBeenCalled());
  const payload = (storesApi.updateCustomer as jest.Mock).mock.calls[0][1];
  expect(payload.address_list).toHaveLength(3);
  expect(payload.address_list.map((a: { id: string }) => a.id)).toEqual(['a1', 'a2', 'a3']);
});

it('grava a alteração no endereço padrão sem tocar nos outros', async () => {
  render(
    <CustomerFormDrawer customer={CLIENTE_COM_3_ENDERECOS} storeSlug="l1"
      onClose={jest.fn()} onSaved={jest.fn()} />,
  );
  fireEvent.change(screen.getByLabelText(/rua/i), { target: { value: 'Rua Nova' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

  await waitFor(() => expect(storesApi.updateCustomer).toHaveBeenCalled());
  const [, payload] = (storesApi.updateCustomer as jest.Mock).mock.calls[0];
  expect(payload.address_list[0]).toEqual(expect.objectContaining({ id: 'a1', street: 'Rua Nova' }));
  expect(payload.address_list[1]).toEqual(expect.objectContaining({ id: 'a2', street: 'Rua do Trabalho' }));
  expect(payload.address_list[2]).toEqual(expect.objectContaining({ id: 'a3', street: 'Casa da Mãe' }));
});

it('avisa na tela que existem outros endereços guardados', async () => {
  render(
    <CustomerFormDrawer customer={CLIENTE_COM_3_ENDERECOS} storeSlug="l1"
      onClose={jest.fn()} onSaved={jest.fn()} />,
  );
  expect(screen.getByText(/mais 2 endereços/i)).toBeInTheDocument();
});
