import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';
import { instagramAccountService, instagramDirectService } from '../../../services/instagram';

// api.ts usa import.meta.env (Vite-only); mockamos para o ts-jest não avaliar o
// módulo. Só precisamos de normalizePaginatedResponse e getErrorMessage aqui.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedResponse: (data: unknown) => (Array.isArray(data) ? data : []),
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: {
    list: jest.fn(),
  },
  instagramDirectService: {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    markAsRead: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// ChatToolsPanel só renderiza com painel ativo; aqui mantemos o foco nos botões
// icon-only do próprio inbox, então um stub leve evita ruído de dependências.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const account = {
  id: 'acc-1',
  username: 'pastita',
};

const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'user-1',
  participant_username: 'cliente',
  participant_name: 'Cliente Teste',
  unread_count: 0,
  status: 'active' as const,
};

describe('InstagramInbox — acessibilidade dos botões icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (instagramAccountService.list as jest.Mock).mockResolvedValue({ data: [account] });
    (instagramDirectService.getConversations as jest.Mock).mockResolvedValue({ data: [conversation] });
    (instagramDirectService.getMessages as jest.Mock).mockResolvedValue({ data: [] });
    (instagramDirectService.markAsRead as jest.Mock).mockResolvedValue({ data: conversation });
  });

  it('expõe nome acessível no botão de atualizar conversas', async () => {
    render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('button', { name: /atualizar conversas/i })
    ).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de enviar mensagem', async () => {
    render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>
    );

    // A conversa é selecionada automaticamente, então a área de envio aparece.
    expect(
      await screen.findByRole('button', { name: /enviar mensagem/i })
    ).toBeInTheDocument();
  });

  it('expõe nome acessível nos botões de templates e ferramentas', async () => {
    render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /templates/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /ferramentas/i })).toBeInTheDocument();
  });
});
