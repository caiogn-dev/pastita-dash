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

jest.mock('../../../services/fiscal', () => ({
  fiscalService: { consultarCnpj: jest.fn() },
}));

// 27/10: HOA COMERCIO DE MOVEIS LTDA virou "HOA" + "COMERCIO DE MOVEIS LTDA"
// e não havia onde guardar CNPJ, razão social nem IE.
import { CustomerFormDrawer } from '../CustomersPage';
import * as storesApi from '../../../services/storesApi';
import { fiscalService } from '../../../services/fiscal';

beforeEach(() => {
  jest.clearAllMocks();
  (storesApi.createCustomer as jest.Mock).mockResolvedValue({ id: 'novo' });
});

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

it('pessoa jurídica manda CNPJ, razão social, fantasia, IE e e-mail', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: /jurídica/i }));
  fireEvent.change(screen.getByLabelText(/^cnpj/i), { target: { value: '11.222.333/0001-81' } });
  fireEvent.change(screen.getByLabelText(/razão social/i), { target: { value: 'HOA COMERCIO DE MOVEIS LTDA' } });
  fireEvent.change(screen.getByLabelText(/nome fantasia/i), { target: { value: 'HOA Móveis' } });
  fireEvent.change(screen.getByLabelText(/inscrição estadual/i), { target: { value: '291234567' } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'compras@hoa.com.br' } });
  salvar();
  await waitFor(() => expect(storesApi.createCustomer).toHaveBeenCalled());
  expect((storesApi.createCustomer as jest.Mock).mock.calls[0][1]).toEqual(expect.objectContaining({
    tipo_pessoa: 'pj', documento: '11222333000181',
    razao_social: 'HOA COMERCIO DE MOVEIS LTDA', nome_fantasia: 'HOA Móveis',
    inscricao_estadual: '291234567', email: 'compras@hoa.com.br',
  }));
});

it('pessoa jurídica sem razão social não salva', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: /jurídica/i }));
  salvar();
  expect(await screen.findByText(/informe a razão social/i)).toBeInTheDocument();
  expect(storesApi.createCustomer).not.toHaveBeenCalled();
});

it('CNPJ preenche a razão social pela Receita', async () => {
  (fiscalService.consultarCnpj as jest.Mock).mockResolvedValue({
    documento: '11222333000181', nome: 'HOA Comercio De Moveis Ltda', nome_fantasia: 'Hoa Moveis',
    email: 'contato@hoa.com.br', inscricao_estadual: '', endereco: {},
  });
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('radio', { name: /jurídica/i }));
  fireEvent.change(screen.getByLabelText(/^cnpj/i), { target: { value: '11222333000181' } });
  fireEvent.click(screen.getByRole('button', { name: /buscar na receita/i }));
  await waitFor(() => expect(screen.getByLabelText(/razão social/i)).toHaveValue('HOA Comercio De Moveis Ltda'));
  expect(screen.getByLabelText(/nome fantasia/i)).toHaveValue('Hoa Moveis');
});

it('pessoa física com CPF inválido não salva', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/^cpf/i), { target: { value: '111.111.111-11' } });
  salvar();
  expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
  expect(storesApi.createCustomer).not.toHaveBeenCalled();
});

it('telefone já cadastrado oferece abrir o cadastro existente', async () => {
  (storesApi.createCustomer as jest.Mock).mockRejectedValue({
    response: { status: 409, data: { error: { code: 'cliente_existente', details: { cliente_id: 'c-velho' } } } },
  });
  (storesApi.getCustomer as jest.Mock).mockResolvedValue({ id: 'c-velho', user_name: 'Joana' });
  const onSaved = jest.fn();
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Outra' } });
  fireEvent.change(screen.getByLabelText(/^telefone$/i), { target: { value: '63999990005' } });
  salvar();
  fireEvent.click(await screen.findByRole('button', { name: /abrir cadastro/i }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-velho' })));
});
