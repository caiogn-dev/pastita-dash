import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';

const list = jest.fn();
const getConversations = jest.fn();
const getMessages = jest.fn();
const markAsRead = jest.fn();
const sendMessage = jest.fn();

// services/api usa import.meta (não parseável pelo Jest); preserva o
// comportamento real das helpers que a página consome.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
  normalizePaginatedResponse: (data: any) =>
    Array.isArray(data) ? data : (data?.results ?? []),
}));

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: {
    list: (...args: unknown[]) => list(...args),
  },
  instagramDirectService: {
    getConversations: (...args: unknown[]) => getConversations(...args),
    getMessages: (...args: unknown[]) => getMessages(...args),
    markAsRead: (...args: unknown[]) => markAsRead(...args),
    sendMessage: (...args: unknown[]) => sendMessage(...args),
  },
}));

// ChatToolsPanel só monta ao abrir um painel; isola a árvore de dependências.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const account = { id: 'acc-1', name: 'Conta', status: 'active' };
const conversation = {
  id: 'conv-1',
  participant_name: 'Cliente Teste',
  participant_username: 'cliente',
  participant_id: 'p1',
  unread_count: 0,
  last_message_at: null,
};

describe('InstagramInbox — acessibilidade do botão de enviar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    list.mockResolvedValue({ data: { results: [account] } });
    getConversations.mockResolvedValue({ data: { results: [conversation] } });
    getMessages.mockResolvedValue({ data: { results: [] } });
  });

  it('expõe nome acessível no botão de enviar mensagem do compositor', async () => {
    render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>
    );

    // Conta e conversa são auto-selecionadas; o compositor monta e seu botão
    // de enviar é icon-only (PaperAirplaneIcon).
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });
});
