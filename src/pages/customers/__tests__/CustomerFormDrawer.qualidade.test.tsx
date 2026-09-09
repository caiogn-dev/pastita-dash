/**
 * O formulário de cliente: valida, formata e mostra quem é a pessoa.
 *
 * Era uma pilha de 11 `<input>` crus com um `inputCls` local — ignorando o
 * `Input` do design system, que já tem rótulo, erro e dica. Salvava nome
 * vazio, salvava telefone com letra, exibia telefone colado, não buscava CEP e
 * não dizia nada sobre o cliente que estava sendo editado.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEventBase from '@testing-library/user-event';
import '@testing-library/jest-dom';

const userEvent = userEventBase.setup({ delay: null });

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
jest.mock('../../../services/cep', () => ({ buscarCep: jest.fn() }));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'l1', storeSlug: 'l1' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../hooks/queries/useCustomers', () => ({
  useCustomers: () => ({ data: null, isLoading: false, isFetching: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../../../hooks/queries/useCustomerStats', () => ({ useCustomerStats: () => ({ data: null, isFetching: false }) }));
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
import { buscarCep } from '../../../services/cep';

const ALINE = {
  id: 'c1', user_name: 'Aline Nasche', user_email: 'aline@x.com',
  phone: '5511975373744', whatsapp: '5511975373744', notes: '',
  gasto_real: 1152.33, pedidos_reais: 32, dias_sem_comprar: 2,
  accepts_marketing: false, tags: [], is_active: true,
  created_at: '2026-01-05T00:00:00Z', address_list: [],
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  (storesApi.createCustomer as jest.Mock).mockResolvedValue({});
  (storesApi.updateCustomer as jest.Mock).mockResolvedValue({});
});

it('recusa salvar sem nome e diz o porquê', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(await screen.findByText(/nome é obrigatório/i)).toBeInTheDocument();
  expect(storesApi.createCustomer).not.toHaveBeenCalled();
});

it('recusa telefone que não é telefone', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/^nome/i), 'Maria');
  await userEvent.type(screen.getByLabelText(/^telefone/i), '99');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(await screen.findByText(/telefone incompleto/i)).toBeInTheDocument();
  expect(storesApi.createCustomer).not.toHaveBeenCalled();
});

it('mostra o telefone salvo já formatado', () => {
  render(<CustomerFormDrawer customer={ALINE} storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getByLabelText(/^telefone/i)).toHaveValue('+55 (11) 97537-3744');
});

it('mostra quem é o cliente que está sendo editado', () => {
  render(<CustomerFormDrawer customer={ALINE} storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  // "Formulário seco": ele não dizia nada sobre a pessoa. Estes três números
  // são os mesmos que a ficha mostra — a edição deixa de ser às cegas.
  expect(screen.getByText(/32 pedidos/i)).toBeInTheDocument();
  expect(screen.getByText(/R\$\s*1\.152,33/)).toBeInTheDocument();
});

it('preenche o endereço a partir do CEP', async () => {
  (buscarCep as jest.Mock).mockResolvedValue({
    street: 'Quadra 104 Sul', neighborhood: 'Plano Diretor Sul', city: 'Palmas', state: 'TO',
  });
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/cep/i), '77020024');
  await waitFor(() => expect(buscarCep).toHaveBeenCalledWith('77020024'));
  await waitFor(() => expect(screen.getByLabelText(/rua/i)).toHaveValue('Quadra 104 Sul'));
  expect(screen.getByLabelText(/cidade/i)).toHaveValue('Palmas');
  expect(screen.getByLabelText(/^uf/i)).toHaveValue('TO');
});

it('CEP que não existe não trava o formulário', async () => {
  (buscarCep as jest.Mock).mockResolvedValue(null);
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/cep/i), '00000000');
  await waitFor(() => expect(buscarCep).toHaveBeenCalled());
  expect(await screen.findByText(/cep não encontrado/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/rua/i)).toHaveValue('');
});

it('permite marcar o consentimento de marketing', async () => {
  render(<CustomerFormDrawer customer={ALINE} storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.click(screen.getByLabelText(/aceita receber campanhas/i));
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(storesApi.updateCustomer).toHaveBeenCalledWith(
    'c1', expect.objectContaining({ accepts_marketing: true }),
  ));
});

it('manda o telefone em dígitos, não a máscara', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/^nome/i), 'Maria');
  await userEvent.type(screen.getByLabelText(/^telefone/i), '63992572020');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(storesApi.createCustomer).toHaveBeenCalledWith(
    'l1', expect.objectContaining({ phone: '5563992572020' }),
  ));
});
