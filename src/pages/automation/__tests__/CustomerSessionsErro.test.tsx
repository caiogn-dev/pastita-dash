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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

test('rejeição de requisição obsoleta não sobrepõe o resultado da mais recente', async () => {
  // Cenário de corrida: ao trocar filtros rápido, uma busca antiga ainda em voo
  // rejeita DEPOIS que a mais recente já respondeu (vazio legítimo). A rejeição
  // obsoleta não pode ligar o estado de erro e apagar o vazio válido.
  let rejeitarObsoleta: (e: unknown) => void = () => {};
  const obsoleta = new Promise((_, reject) => {
    rejeitarObsoleta = reject;
  });
  listMock
    .mockReturnValueOnce(obsoleta) // 1ª busca (montagem) — fica em voo e rejeita depois
    .mockResolvedValueOnce({ results: [], count: 0 }); // 2ª busca (filtro) — a mais recente

  render(
    <MemoryRouter>
      <CustomerSessionsPage />
    </MemoryRouter>,
  );

  // Abre os filtros e muda o telefone → dispara a 2ª busca (a mais recente).
  fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '11' } });

  // A mais recente resolveu vazio → aparece o vazio legítimo.
  expect(
    await screen.findByText(/ninguém no meio de um pedido/i),
  ).toBeInTheDocument();

  // Agora a 1ª (obsoleta) rejeita: NÃO pode virar "erro ao carregar".
  await act(async () => {
    rejeitarObsoleta(new Error('500'));
    await Promise.resolve();
  });

  expect(
    screen.queryByText(/não foi possível carregar as sessões/i),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/ninguém no meio de um pedido/i),
  ).toBeInTheDocument();
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
