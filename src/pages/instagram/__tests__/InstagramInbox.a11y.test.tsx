import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';

// ChatToolsPanel só renderiza ao abrir um painel; mockamos para isolar o inbox.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

// api.ts usa import.meta (não transformado pelo ts-jest); mockamos os helpers usados.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
  normalizePaginatedResponse: (data: unknown) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'results' in (data as Record<string, unknown>)) {
      const results = (data as { results: unknown }).results;
      return Array.isArray(results) ? results : [];
    }
    return [];
  },
}));

const list = jest.fn();
const getConversations = jest.fn();
const getMessages = jest.fn();
const markAsRead = jest.fn();
const sendMessage = jest.fn();

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

const account = { id: 'acc-1', username: 'loja', status: 'active' };
const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'p-1',
  participant_username: 'cliente',
  participant_name: 'Cliente Teste',
  unread_count: 0,
  status: 'active',
};

const renderInbox = () =>
  render(
    <MemoryRouter>
      <InstagramInbox />
    </MemoryRouter>
  );

describe('InstagramInbox — acessibilidade dos botões icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    list.mockResolvedValue({ data: [account] });
    getConversations.mockResolvedValue({ data: [conversation] });
    getMessages.mockResolvedValue({ data: [] });
    markAsRead.mockResolvedValue({ data: conversation });
    sendMessage.mockResolvedValue({ data: {} });
  });

  it('expõe nome acessível no botão de atualizar conversas', async () => {
    renderInbox();
    const atualizar = await screen.findByRole('button', { name: /atualizar conversas/i });
    expect(atualizar).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de enviar mensagem do Instagram', async () => {
    renderInbox();

    // A primeira conversa é auto-selecionada, abrindo a área de composição.
    await screen.findByPlaceholderText(/responder no instagram/i);

    // O botão de enviar é icon-only (avião de papel) e precisa de nome acessível.
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });
});
