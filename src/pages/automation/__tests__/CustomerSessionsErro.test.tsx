/**
 * A lista de sessões não pode transformar uma falha de rede no "ninguém está
 * comprando agora".
 *
 * `CustomerSessionsPage` carrega as sessões por `useState`/`useEffect`. No erro,
 * só disparava um `toast` (que some em segundos) e deixava `sessions` em `[]`,
 * com `loading = false`. A `Tabela` então mostrava o vazio confiante
 * "Ninguém no meio de um pedido agora" — dizendo ao lojista que não há carrinho
 * em andamento quando, na verdade, a requisição caiu. É o mesmo engano de
 * "zeros/vazio enganoso" que o loop já corrigiu na ficha do cliente e no
 * cardápio. Aqui garantimos o erro acionável (com "Tentar novamente") no lugar
 * do vazio, e que o caminho de sucesso continua mostrando as sessões reais.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const listMock = jest.fn();
const companiesListMock = jest.fn();
jest.mock('../../../services/automation', () => ({
  __esModule: true,
  customerSessionService: {
    list: (...args: unknown[]) => listMock(...args),
    sendNotification: jest.fn(),
  },
  companyProfileService: {
    list: (...args: unknown[]) => companiesListMock(...args),
  },
  sessionStatusLabels: { active: 'Ativa', cart_abandoned: 'Carrinho abandonado' },
}));

jest.mock('react-hot-toast', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

import CustomerSessionsPage from '../CustomerSessionsPage';

const umaSessao = () => ({
  id: 's1',
  customer_name: 'Maria',
  phone_number: '11999999999',
  company_name: 'Loja da Maria',
  status: 'cart_abandoned',
  cart_items_count: 2,
  cart_total: 50,
  last_activity_at: '2026-09-20T12:00:00Z',
});

beforeEach(() => {
  listMock.mockReset();
  companiesListMock.mockReset();
  companiesListMock.mockResolvedValue({ results: [], count: 0 });
});

test('falha sem cache → erro acionável, nunca o vazio enganoso de "ninguém no meio de um pedido"', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <CustomerSessionsPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar as sessões/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "não há carrinho em andamento".
  expect(
    screen.queryByText(/ninguém no meio de um pedido/i),
  ).not.toBeInTheDocument();

  // O botão refaz a busca.
  listMock.mockResolvedValueOnce({ results: [], count: 0 });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
});

test('sucesso → renderiza as sessões, sem estado de erro', async () => {
  listMock.mockResolvedValue({ results: [umaSessao()], count: 1 });

  render(
    <MemoryRouter>
      <CustomerSessionsPage />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText('Maria')).length).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar as sessões/i),
  ).not.toBeInTheDocument();
});
