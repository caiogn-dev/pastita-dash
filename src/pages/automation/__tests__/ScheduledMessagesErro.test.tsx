/**
 * Mensagens agendadas não podem transformar uma falha de rede no "nenhuma
 * mensagem agendada".
 *
 * `ScheduledMessagesPage` carrega a lista e as estatísticas por
 * `useState`/`useEffect` (um `Promise.all`). No erro (rede/500) sem cache, o
 * `catch` só disparava um `toast` (que some em segundos) e deixava `messages`
 * em `[]`, `stats` em `null` e `loading = false`. A `Tabela` então mostrava o
 * vazio confiante "Nenhuma mensagem agendada" — dizendo ao lojista que não há
 * nenhum disparo programado quando, na verdade, a busca caiu. É o mesmo engano
 * de "vazio/zeros enganoso" que o loop já corrigiu em Clientes, Cardápio e
 * Sessões. Aqui garantimos o erro acionável (com "Tentar novamente") no lugar
 * do vazio, e que o caminho de sucesso continua mostrando as mensagens reais.
 */
import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// O barrel de hooks puxa o WebSocket/realtime (import.meta), que não é o alvo
// aqui — só precisamos do `useConfirm` que a página consome.
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useConfirm: () => [null, jest.fn().mockResolvedValue(true)],
}));

const listMock = jest.fn();
const getStatsMock = jest.fn();
jest.mock('../../../services/scheduling', () => ({
  __esModule: true,
  scheduledMessagesService: {
    list: (...args: unknown[]) => listMock(...args),
    getStats: (...args: unknown[]) => getStatsMock(...args),
    create: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
  },
}));

const getAccountsMock = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  whatsappService: {
    getAccounts: (...args: unknown[]) => getAccountsMock(...args),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

import ScheduledMessagesPage from '../ScheduledMessagesPage';

const umaMensagem = () => ({
  id: 'm1',
  to_number: '11999999999',
  contact_name: 'Maria',
  message_type: 'text',
  message_text: 'Oi',
  scheduled_at: '2026-09-25T12:00:00Z',
  status: 'pending',
  status_display: 'Pendente',
  account_name: 'Loja da Maria',
});

const statsZerados = () => ({
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  cancelled: 0,
  scheduled_today: 0,
  sent_today: 0,
});

beforeEach(() => {
  listMock.mockReset();
  getStatsMock.mockReset();
  getAccountsMock.mockReset();
  getAccountsMock.mockResolvedValue({ data: { results: [] } });
  getStatsMock.mockResolvedValue(statsZerados());
});

test('falha sem cache → erro acionável, nunca o vazio enganoso "nenhuma mensagem agendada"', async () => {
  listMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <ScheduledMessagesPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar as mensagens agendadas/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "não há nada programado".
  expect(screen.queryByText(/nenhuma mensagem agendada/i)).not.toBeInTheDocument();

  // O botão refaz a busca; com sucesso vazio, o erro sai e o vazio legítimo
  // ("Nenhuma mensagem agendada") volta ao lugar.
  listMock.mockResolvedValueOnce({ results: [] });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/nenhuma mensagem agendada/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/não foi possível carregar as mensagens agendadas/i),
  ).not.toBeInTheDocument();
});

test('rejeição de requisição obsoleta não sobrepõe o resultado da mais recente (StrictMode)', async () => {
  // Sob `React.StrictMode` (usado no `main.tsx`), o efeito de montagem dispara
  // `fetchData` duas vezes: duas buscas sobrepostas. Se a 1ª (obsoleta) rejeitar
  // DEPOIS de a 2ª (a mais recente) já ter resolvido vazio, a rejeição obsoleta
  // não pode ligar o erro e apagar o vazio legítimo.
  let rejeitarObsoleta: (e: unknown) => void = () => {};
  const obsoleta = new Promise((_, reject) => {
    rejeitarObsoleta = reject;
  });
  listMock
    .mockReturnValueOnce(obsoleta) // 1ª busca (montagem) — fica em voo e rejeita depois
    .mockResolvedValueOnce({ results: [] }); // 2ª busca (remontagem StrictMode) — a mais recente

  render(
    <StrictMode>
      <MemoryRouter>
        <ScheduledMessagesPage />
      </MemoryRouter>
    </StrictMode>,
  );

  // A mais recente resolveu vazio → aparece o vazio legítimo.
  expect(await screen.findByText(/nenhuma mensagem agendada/i)).toBeInTheDocument();
  expect(listMock).toHaveBeenCalledTimes(2);

  // Agora a 1ª (obsoleta) rejeita: NÃO pode virar "não foi possível carregar".
  await act(async () => {
    rejeitarObsoleta(new Error('500'));
    await Promise.resolve();
  });

  expect(
    screen.queryByText(/não foi possível carregar as mensagens agendadas/i),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/nenhuma mensagem agendada/i)).toBeInTheDocument();
});

test('sucesso → renderiza as mensagens, sem estado de erro', async () => {
  listMock.mockResolvedValue({ results: [umaMensagem()] });

  render(
    <MemoryRouter>
      <ScheduledMessagesPage />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText('11999999999')).length).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar as mensagens agendadas/i),
  ).not.toBeInTheDocument();
});
