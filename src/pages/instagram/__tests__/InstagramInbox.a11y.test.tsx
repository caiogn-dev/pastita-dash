import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';
import {
  InstagramAccount,
  InstagramConversation,
  InstagramMessage,
  instagramAccountService,
  instagramDirectService,
} from '../../../services/instagram';

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: { list: jest.fn() },
  instagramDirectService: {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    markAsRead: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// services/api usa import.meta.env, que o ts-jest não interpreta; mockamos apenas
// os helpers puros consumidos pelo inbox mantendo o comportamento real.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Erro',
  normalizePaginatedResponse: <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object' && 'results' in data) {
      const results = (data as { results: unknown }).results;
      if (Array.isArray(results)) return results as T[];
    }
    return [];
  },
}));

// O painel de ferramentas só renderiza sob demanda; mockamos para isolar o inbox.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const account: InstagramAccount = {
  id: 'acc-1',
  platform: 'instagram',
  username: 'loja_teste',
  followers_count: 0,
  follows_count: 0,
  media_count: 0,
  biography: '',
  is_active: true,
  is_verified: false,
  created_at: '2026-06-30T12:00:00Z',
};

const conversation: InstagramConversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'user-1',
  participant_username: 'cliente',
  participant_name: 'Cliente Teste',
  unread_count: 0,
  status: 'active',
  last_message_at: '2026-06-30T12:00:00Z',
};

const message: InstagramMessage = {
  id: 'msg-1',
  conversation: 'conv-1',
  content: 'Ola!',
  direction: 'inbound',
  created_at: '2026-06-30T12:00:00Z',
};

describe('InstagramInbox — acessibilidade dos botões icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (instagramAccountService.list as jest.Mock).mockResolvedValue({ data: [account] });
    (instagramDirectService.getConversations as jest.Mock).mockResolvedValue({
      data: [conversation],
    });
    (instagramDirectService.getMessages as jest.Mock).mockResolvedValue({ data: [message] });
    (instagramDirectService.markAsRead as jest.Mock).mockResolvedValue({ data: conversation });
  });

  it('expõe nome acessível no botão de enviar mensagem (icon-only)', async () => {
    render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>
    );

    // Com uma conta e uma conversa, a conversa é auto-selecionada e a área de
    // envio é renderizada. O botão é apenas um ícone e precisa de nome acessível.
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });
});
