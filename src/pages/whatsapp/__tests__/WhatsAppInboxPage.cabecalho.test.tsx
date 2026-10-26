/**
 * Cabeçalho do chat e filtros da lista (26/10).
 *
 * - "🤖 Bot / 👤 Humano" vira "Robô atende / Eu atendo", com ícone e sem emoji;
 * - "Templates" vira "Modelos";
 * - Resolver/Fechar/Reabrir moravam só na aba "Todas" (que saiu): vieram para
 *   o cabeçalho do chat;
 * - o chip "Humano" contava toda conversa em modo humano, e "Esperando
 *   atendente" contava só quem escreveu e não teve resposta. Agora o chip se
 *   chama "Esperando" e usa a mesma fila da tela "Esperando atendente".
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WhatsAppInboxPage from '../WhatsAppInboxPage';
import { useChatStore } from '../../../stores/chatStore';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
jest.mock('../../../services', () => ({ __esModule: true, getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../services/whatsapp', () => ({ __esModule: true, sendMessage: jest.fn() }));
jest.mock('../../../services/handover', () => ({
  __esModule: true, handoverService: { transferToHuman: jest.fn(), transferToBot: jest.fn() },
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'loja-1', storeName: 'Loja', store: null }),
}));
jest.mock('../../../context/WhatsAppWsContext', () => ({
  __esModule: true,
  useWhatsAppWsContext: () => ({
    isConnected: true, connectionError: null, subscribeToConversation: jest.fn(),
    unsubscribeFromConversation: jest.fn(), sendTypingIndicator: jest.fn(), reconnect: jest.fn(),
  }),
}));

const conversa = (over: Record<string, unknown>) => ({
  id: 'conv-1', account: 'acc-1', phone_number: '5563999990000', contact_name: 'Maria Souza',
  mode: 'human', status: 'open', last_message_preview: '', ...over,
});
const getConversations = jest.fn();
const getFilaHumana = jest.fn();
const resolveConversation = jest.fn();
const reopenConversation = jest.fn();
const closeConversation = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: (...a: unknown[]) => getConversations(...a),
    getMessages: jest.fn().mockResolvedValue({ results: [] }),
    getFilaHumana: (...a: unknown[]) => getFilaHumana(...a),
    resolveConversation: (...a: unknown[]) => resolveConversation(...a),
    reopenConversation: (...a: unknown[]) => reopenConversation(...a),
    closeConversation: (...a: unknown[]) => closeConversation(...a),
  },
}));
jest.mock('../../../components/chat/ChatToolsPanel', () => ({ __esModule: true, ChatToolsPanel: () => null }));

const renderizar = (url = '/inbox?conversation=conv-1') => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/inbox" element={<WhatsAppInboxPage />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.getState().setConversations([]);
  useChatStore.getState().setSelectedConversation(null);
  getConversations.mockResolvedValue({ results: [
    conversa({}),
    conversa({ id: 'conv-2', contact_name: 'Ana Lima', phone_number: '5563999991111' }),
    conversa({ id: 'conv-3', contact_name: 'Bia', phone_number: '5563999992222', mode: 'auto' }),
  ] });
  // Só a Maria escreveu e não teve resposta; a Ana está em atendimento.
  getFilaHumana.mockResolvedValue({
    esperando: [{ id: 'conv-1' }], em_atendimento: [{ id: 'conv-2' }],
    total_esperando: 1, total_em_atendimento: 1,
  });
  resolveConversation.mockResolvedValue(conversa({ status: 'resolved' }));
  reopenConversation.mockResolvedValue(conversa({ status: 'open' }));
});

it('modo de atendimento em palavras: "Robô atende" e "Eu atendo", sem emoji', async () => {
  renderizar();
  const grupo = await screen.findByRole('group', { name: /modo de atendimento/i });
  expect(within(grupo).getByRole('button', { name: 'Robô atende' })).toBeInTheDocument();
  expect(within(grupo).getByRole('button', { name: 'Eu atendo' })).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/🤖|👤/u);
});

it('"Modelos" no lugar de "Templates"', async () => {
  renderizar();
  await screen.findByRole('group', { name: /modo de atendimento/i });
  expect(screen.getByRole('button', { name: 'Modelos' })).toBeInTheDocument();
  expect(screen.queryByText('Templates')).not.toBeInTheDocument();
});

it('o chip "Esperando" conta pela mesma fila da tela Esperando atendente', async () => {
  renderizar();
  const filtros = await screen.findByRole('tablist', { name: /filtrar conversas/i });
  expect(within(filtros).queryByRole('tab', { name: /humano/i })).not.toBeInTheDocument();
  const esperando = await within(filtros).findByRole('tab', { name: /esperando\s*1/i });
  expect(getFilaHumana).toHaveBeenCalledWith('loja-1');

  fireEvent.click(esperando);
  const lista = document.querySelector('.conversations-list') as HTMLElement;
  await waitFor(() => expect(within(lista).queryByText('Ana Lima')).not.toBeInTheDocument());
  expect(within(lista).getByText('Maria Souza')).toBeInTheDocument();
});

it('Resolver mora no cabeçalho do chat', async () => {
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: 'Resolver' }));
  await waitFor(() => expect(resolveConversation).toHaveBeenCalledWith('conv-1'));
  expect(await screen.findByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
});

it('conversa resolvida oferece Reabrir', async () => {
  getConversations.mockResolvedValue({ results: [conversa({ status: 'resolved' })] });
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));
  await waitFor(() => expect(reopenConversation).toHaveBeenCalledWith('conv-1'));
});
