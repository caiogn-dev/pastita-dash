import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';
import { instagramAccountService, instagramDirectService } from '../../../services/instagram';

jest.mock('../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: {
    list: jest.fn(),
  },
  instagramDirectService: {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

// api.ts usa import.meta (Vite), incompatível com o runtime do Jest — fornecemos
// implementações equivalentes das únicas utilidades consumidas pelo componente.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
  normalizePaginatedResponse: (data: unknown) => {
    if (!data) return [];
    if (typeof data === 'object' && data !== null && 'results' in data) {
      const results = (data as { results: unknown }).results;
      if (Array.isArray(results)) return results;
    }
    return Array.isArray(data) ? data : [];
  },
}));

// ChatToolsPanel só é renderizado sob demanda; simplificamos para evitar dependências.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const account = {
  id: 'acc-1',
  username: 'lojinha',
  is_active: true,
};

const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'user-1',
  participant_username: 'cliente',
  participant_name: 'Cliente Teste',
  unread_count: 0,
  status: 'active',
};

describe('InstagramInbox — acessibilidade dos controles icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (instagramAccountService.list as jest.Mock).mockResolvedValue({ data: [account] });
    (instagramDirectService.getConversations as jest.Mock).mockResolvedValue({ data: [conversation] });
    (instagramDirectService.getMessages as jest.Mock).mockResolvedValue({ data: [] });
    (instagramDirectService.markAsRead as jest.Mock).mockResolvedValue({ data: conversation });
  });

  function renderInbox() {
    return render(
      <MemoryRouter>
        <InstagramInbox />
      </MemoryRouter>,
    );
  }

  it('expõe nome acessível no botão de atualizar e no campo de busca', async () => {
    renderInbox();

    expect(await screen.findByRole('button', { name: /atualizar conversas/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /buscar conversas/i })).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de enviar e no campo de mensagem ao abrir uma conversa', async () => {
    const user = userEvent.setup();
    renderInbox();

    // Seleciona a conversa para abrir o painel de mensagens.
    const conversationButton = await screen.findByRole('button', { name: /cliente teste/i });
    await user.click(conversationButton);

    // Botão de envio é icon-only e precisa de nome acessível para leitores de tela.
    expect(await screen.findByRole('button', { name: /enviar mensagem/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^mensagem$/i })).toBeInTheDocument();
  });
});
