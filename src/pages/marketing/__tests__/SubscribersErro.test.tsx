/**
 * A base de clientes não pode transformar uma falha de carga em "0 clientes".
 *
 * `SubscribersPage` carrega a base por `useState`/`useEffect` chamando
 * `marketingService.subscribers.list`. No erro, só disparava um `toast` (que
 * some em segundos) e deixava `subscribers` em `[]`, com `loading = false`. A
 * tela então mostrava os KPIs zerados ("Total na base 0", "Receita identificada
 * R$ 0,00") e o vazio confiante "Nenhum cliente na base ainda", dizendo a uma
 * loja que já vendeu que ela não tem cliente nenhum. É o mesmo "vazio/zeros
 * enganoso" já corrigido em Clientes (#199), Cardápio (#202), Perfis (#215) e
 * tantas outras. Aqui garantimos o erro acionável (com "Tentar de novo") no
 * lugar dos zeros, e que o caminho de sucesso continua mostrando a base real.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const navegar = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navegar,
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeName: 'Cê', stores: [] }),
}));

jest.mock('../../../stores/rootStore', () => ({
  __esModule: true,
  useRootStore: () => ({ setSelectedStore: jest.fn() }),
}));

const listMock = jest.fn();
jest.mock('../../../services/marketingService', () => ({
  __esModule: true,
  marketingService: {
    subscribers: {
      list: (...args: unknown[]) => listMock(...args),
      create: jest.fn(),
      importCsv: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { SubscribersPage } from '../SubscribersPage';

const umCliente = () => ({
  id: 'c1',
  store: 'loja-1',
  email: 'maria@exemplo.com',
  name: 'Maria Silva',
  status: 'active' as const,
  tags: [],
  total_orders: 3,
  total_spent: 150,
  accepts_marketing: true,
  subscribed_at: '',
  created_at: '',
});

const tela = () => render(<MemoryRouter><SubscribersPage /></MemoryRouter>);

beforeEach(() => {
  navegar.mockReset();
  listMock.mockReset();
});

test('falha sem cache → erro acionável, nunca os zeros/"Nenhum cliente na base ainda"', async () => {
  listMock.mockRejectedValueOnce(new Error('rede'));
  tela();

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar a base de clientes/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "você não tem cliente".
  expect(screen.queryByText(/nenhum cliente na base ainda/i)).not.toBeInTheDocument();

  // O botão refaz a busca e traz o cliente real.
  listMock.mockResolvedValueOnce([umCliente()]);
  fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  expect((await screen.findAllByText('Maria Silva')).length).toBeGreaterThan(0);
});

test('busca vazia legítima mantém o "Nenhum cliente na base ainda"', async () => {
  listMock.mockResolvedValue([]);
  tela();

  expect(await screen.findByText(/nenhum cliente na base ainda/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar a base de clientes/i),
  ).not.toBeInTheDocument();
});

test('sucesso → renderiza a base, sem estado de erro', async () => {
  listMock.mockResolvedValue([umCliente()]);
  tela();

  expect((await screen.findAllByText('Maria Silva')).length).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar a base de clientes/i),
  ).not.toBeInTheDocument();
});
