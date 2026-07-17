import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';

// ChatToolsPanel puxa muitas dependências (produtos, combos, etc.) irrelevantes
// para o teste de acessibilidade do inbox — substituímos por um stub.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

// services/api usa import.meta.env, que o Jest não consegue transformar; provemos
// um mock fiel de normalizePaginatedResponse (aceita array ou { results }).
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (error: unknown) => String(error),
  normalizePaginatedResponse: (data: unknown) => {
    if (data && typeof data === 'object' && 'results' in (data as object)) {
      const results = (data as { results: unknown }).results;
      return Array.isArray(results) ? results : [];
    }
    return Array.isArray(data) ? data : [];
  },
}));

const listAccounts = jest.fn();
const getConversations = jest.fn();
const getMessages = jest.fn();
const markAsRead = jest.fn();

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: {
    list: (...args: unknown[]) => listAccounts(...args),
  },
  instagramDirectService: {
    getConversations: (...args: unknown[]) => getConversations(...args),
    getMessages: (...args: unknown[]) => getMessages(...args),
    markAsRead: (...args: unknown[]) => markAsRead(...args),
  },
}));

const account = { id: 'acc-1', username: 'loja', platform: 'instagram' };
const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'part-1',
  participant_name: 'Cliente Teste',
  unread_count: 0,
  status: 'active',
};
const message = {
  id: 'msg-1',
  conversation: 'conv-1',
  content: 'Olá!',
  direction: 'inbound',
  created_at: new Date('2026-07-17T12:00:00Z').toISOString(),
};

const renderInbox = () =>
  render(
    <MemoryRouter>
      <InstagramInbox />
    </MemoryRouter>
  );

describe('InstagramInbox — acessibilidade do botão de enviar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom não implementa scrollIntoView, usado pelo efeito de rolagem das mensagens.
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    listAccounts.mockResolvedValue({ data: [account] });
    getConversations.mockResolvedValue({ data: [conversation] });
    getMessages.mockResolvedValue({ data: [message] });
    markAsRead.mockResolvedValue({ data: conversation });
  });

  it('expõe nome acessível no botão de enviar mensagem', async () => {
    renderInbox();

    // Conta e conversa são auto-selecionadas pelos efeitos, então o compositor
    // (com o botão de enviar) é renderizado sem interação. O botão é icon-only
    // e precisa de um nome acessível para leitores de tela.
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });
});
