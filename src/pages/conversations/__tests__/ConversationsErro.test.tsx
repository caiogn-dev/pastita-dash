/**
 * A lista de conversas (aba "Todas" do inbox) não pode transformar uma falha de
 * rede no confiante "Nenhuma conversa encontrada".
 *
 * `ConversationsPage` carrega as conversas por `useState`/`useEffect`
 * (`conversationsService.getUniversalConversations`). No erro, só disparava um
 * `toast` (que some em segundos) e deixava `conversations` em `[]`, com
 * `isLoading = false`. A `Tabela` então mostrava o vazio confiante "Nenhuma
 * conversa encontrada" — dizendo ao lojista que não há conversa nenhuma quando,
 * na verdade, a requisição caiu. É o mesmo engano de "vazio enganoso" que o loop
 * já corrigiu em Clientes (#199), Cardápio (#202), Sessões (#204), Agendadas
 * (#205), Avisos (#208), Logs de automação (#210) e Conexões (#211). Aqui
 * garantimos o erro acionável (com "Tentar novamente") no lugar do vazio, e que
 * o caminho de sucesso continua mostrando as conversas reais.
 */
import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// O barrel `../../services` puxa `websocket.ts` → `uuid` (ESM), que o jest não
// parseia, além de `api.ts`, que lança sem `VITE_API_URL`. A página só usa
// `conversationsService` e `getErrorMessage` do barrel — mockamos só isso.
const getUniversalMock = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  conversationsService: {
    getUniversalConversations: (...args: unknown[]) => getUniversalMock(...args),
  },
  getErrorMessage: () => 'Erro ao carregar conversas',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
  toast: { error: jest.fn(), success: jest.fn() },
}));

import { ConversationsPage } from '../ConversationsPage';

const umaConversa = () => ({
  id: 'c1',
  platform: 'whatsapp' as const,
  platform_icon_key: 'whatsapp' as const,
  source_conversation_id: 's1',
  display_name: 'Maria Compradora',
  secondary_identifier: '11999999999',
  last_message_preview: 'Oi, tem entrega hoje?',
  last_message_at: '2026-09-29T12:00:00Z',
  unread_count: 1,
  status: 'active',
  route: '/inbox',
  route_params: {},
  is_actionable: true,
});

beforeEach(() => {
  getUniversalMock.mockReset();
});

test('falha sem cache → erro acionável, nunca o vazio enganoso de "nenhuma conversa encontrada"', async () => {
  getUniversalMock.mockRejectedValueOnce(new Error('500'));

  render(
    <MemoryRouter>
      <ConversationsPage />
    </MemoryRouter>,
  );

  // Mostra o erro acionável...
  expect(
    await screen.findByText(/não foi possível carregar as conversas/i),
  ).toBeInTheDocument();
  // ...e nunca o vazio confiante, que leria como "não há nenhuma conversa".
  expect(screen.queryByText(/nenhuma conversa encontrada/i)).not.toBeInTheDocument();

  // O botão refaz a busca (e agora traz uma conversa de verdade).
  getUniversalMock.mockResolvedValueOnce({ results: [umaConversa()], count: 1 });
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  await waitFor(() => expect(getUniversalMock).toHaveBeenCalledTimes(2));
  expect((await screen.findAllByText(/maria compradora/i)).length).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar as conversas/i),
  ).not.toBeInTheDocument();
});

test('rejeição de requisição obsoleta não sobrepõe o resultado da mais recente', async () => {
  // Cenário de corrida: sob `React.StrictMode` (usado no `main.tsx`) o efeito de
  // montagem dispara `loadConversations` DUAS vezes — o polling de 60s também
  // sobrepõe buscas. A 1ª (obsoleta) fica em voo e rejeita DEPOIS que a 2ª (a
  // mais recente) já respondeu vazio (vazio legítimo). A rejeição obsoleta não
  // pode ligar o estado de erro e apagar o vazio válido.
  let rejeitarObsoleta: (e: unknown) => void = () => {};
  const obsoleta = new Promise((_, reject) => {
    rejeitarObsoleta = reject;
  });
  getUniversalMock
    .mockReturnValueOnce(obsoleta) // 1ª montagem (StrictMode) — fica em voo e rejeita depois
    .mockResolvedValueOnce({ results: [], count: 0 }); // 2ª montagem — a mais recente

  render(
    <StrictMode>
      <MemoryRouter>
        <ConversationsPage />
      </MemoryRouter>
    </StrictMode>,
  );

  // A mais recente resolveu vazio → vazio legítimo.
  expect(await screen.findByText(/nenhuma conversa encontrada/i)).toBeInTheDocument();

  // Agora a 1ª (obsoleta) rejeita: NÃO pode virar "não foi possível carregar".
  await act(async () => {
    rejeitarObsoleta(new Error('500'));
    await Promise.resolve();
  });

  expect(
    screen.queryByText(/não foi possível carregar as conversas/i),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/nenhuma conversa encontrada/i)).toBeInTheDocument();
});

test('sucesso → renderiza as conversas, sem estado de erro', async () => {
  getUniversalMock.mockResolvedValue({ results: [umaConversa()], count: 1 });

  render(
    <MemoryRouter>
      <ConversationsPage />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText(/maria compradora/i)).length).toBeGreaterThan(0);
  expect(
    screen.queryByText(/não foi possível carregar as conversas/i),
  ).not.toBeInTheDocument();
});

test('refresh manual expõe estado pendente: botão desabilita enquanto a busca está em voo', async () => {
  // Regressão apontada na review (Codex, P2): depois da 1ª carga, o botão
  // Atualizar liga `isLoading` (não `refreshing`) e já não cai no PageLoading,
  // então sem feedback ele parecia não fazer nada e aceitava cliques repetidos.
  // O botão precisa expor o estado pendente (spinner + desabilitado).
  let resolverRefresh: (v: unknown) => void = () => {};
  const refreshEmVoo = new Promise((resolve) => {
    resolverRefresh = resolve;
  });
  getUniversalMock
    .mockResolvedValueOnce({ results: [umaConversa()], count: 1 }) // 1ª carga
    .mockReturnValueOnce(refreshEmVoo); // refresh manual — fica em voo

  render(
    <MemoryRouter>
      <ConversationsPage />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText(/maria compradora/i)).length).toBeGreaterThan(0);

  const botaoAtualizar = screen.getByRole('button', { name: /atualizar/i });
  expect(botaoAtualizar).toBeEnabled();

  // Dispara o refresh: enquanto em voo, o botão fica desabilitado (feedback).
  fireEvent.click(botaoAtualizar);
  await waitFor(() => expect(botaoAtualizar).toBeDisabled());

  // Concluída a busca, volta a ficar clicável.
  await act(async () => {
    resolverRefresh({ results: [umaConversa()], count: 1 });
    await Promise.resolve();
  });
  await waitFor(() => expect(botaoAtualizar).toBeEnabled());
});
