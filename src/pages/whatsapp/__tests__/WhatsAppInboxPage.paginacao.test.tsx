/**
 * Lista de conversas: busca no servidor + scroll infinito.
 *
 * 06/ago: o operador via 20 conversas de 123. A tela pedia a lista sem
 * `page_size` (backend pagina de 20) e nunca pedia a página seguinte; a busca
 * filtrava só o que já estava carregado, então procurar um cliente da posição
 * 40 não achava nada — mesmo a conversa existindo.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppInboxPage from '../WhatsAppInboxPage';
import { useChatStore } from '../../../stores/chatStore';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../services', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../services/whatsapp', () => ({
  __esModule: true,
  sendMessage: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../services/handover', () => ({
  __esModule: true,
  handoverService: { transferToHuman: jest.fn(), transferToBot: jest.fn() },
}));

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({
    storeId: 'loja-1', storeSlug: 'loja-1', storeName: 'Loja Teste', store: null,
  }),
}));

jest.mock('../../../context/WhatsAppWsContext', () => ({
  __esModule: true,
  useWhatsAppWsContext: () => ({
    isConnected: true,
    connectionError: null,
    subscribeToConversation: jest.fn(),
    unsubscribeFromConversation: jest.fn(),
    sendTypingIndicator: jest.fn(),
    reconnect: jest.fn(),
  }),
}));

const getConversations = jest.fn();
const getMessages = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: (...args: unknown[]) => getConversations(...args),
    getMessages: (...args: unknown[]) => getMessages(...args),
    markAsRead: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const conversa = (id: string, nome: string) => ({
  id,
  account: 'acc-1',
  phone_number: `55639${id.padStart(8, '0')}`,
  contact_name: nome,
  mode: 'auto',
  last_message_preview: '',
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/inbox']}>
      <WhatsAppInboxPage />
    </MemoryRouter>
  );

const ultimaChamada = () => getConversations.mock.calls.at(-1)?.[0] ?? {};

describe('WhatsAppInboxPage — paginação e busca da lista', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().setConversations([]);
    getMessages.mockResolvedValue({ results: [] });
    getConversations.mockResolvedValue({
      count: 123,
      next: 'http://api/next',
      previous: null,
      results: [conversa('1', 'Leani'), conversa('2', 'Margô')],
    });
  });

  it('pede page_size explícito — sem isso vinham só 20 de 123', async () => {
    renderPage();
    await waitFor(() => expect(getConversations).toHaveBeenCalled());
    const params = ultimaChamada();
    expect(params.page_size).toBeGreaterThan(20);
    expect(params.page).toBe(1);
  });

  it('manda a busca para o SERVIDOR, não filtra só o que está na tela', async () => {
    jest.useFakeTimers();
    try {
      renderPage();
      await act(async () => { await Promise.resolve(); });

      const campo = screen.getByPlaceholderText(/buscar conversa/i);
      fireEvent.change(campo, { target: { value: 'Marilene' } });

      // debounce
      await act(async () => { jest.advanceTimersByTime(400); });

      await waitFor(() => {
        expect(ultimaChamada().search).toBe('Marilene');
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('não manda `search` quando o campo está vazio', async () => {
    renderPage();
    await waitFor(() => expect(getConversations).toHaveBeenCalled());
    expect(ultimaChamada().search).toBeUndefined();
  });

  it('busca a próxima página ao chegar perto do fim da lista', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(getConversations).toHaveBeenCalledTimes(1));

    getConversations.mockResolvedValue({
      count: 123,
      next: null,
      previous: null,
      results: [conversa('3', 'Marilene')],
    });

    const lista = container.querySelector('.conversations-list') as HTMLElement;
    Object.defineProperty(lista, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(lista, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(lista, 'scrollTop', { value: 550, configurable: true });
    fireEvent.scroll(lista);

    await waitFor(() => expect(ultimaChamada().page).toBe(2));
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(3);
    });
  });

  it('não duplica conversa que já estava na lista', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(getConversations).toHaveBeenCalledTimes(1));

    // A página 2 devolve uma conversa que o WebSocket já tinha promovido.
    getConversations.mockResolvedValue({
      count: 123,
      next: null,
      previous: null,
      results: [conversa('1', 'Leani'), conversa('9', 'Nova')],
    });

    const lista = container.querySelector('.conversations-list') as HTMLElement;
    Object.defineProperty(lista, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(lista, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(lista, 'scrollTop', { value: 550, configurable: true });
    fireEvent.scroll(lista);

    await waitFor(() => {
      const ids = useChatStore.getState().conversations.map((c) => c.id);
      expect(ids).toEqual(['1', '2', '9']);
    });
  });
});
