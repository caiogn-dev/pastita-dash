import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstagramInbox from '../InstagramInbox';
import { instagramAccountService, instagramDirectService } from '../../../services/instagram';

// O componente importa um CSS via WhatsAppInbox.css; stub virtual evita resolver o arquivo.
jest.mock('../../whatsapp/WhatsAppInbox.css', () => ({}), { virtual: true });

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

// services/api usa import.meta.env, que o jest não parseia. Mockamos com o
// comportamento real das funções puras usadas pelo componente.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (err: unknown) => String(err),
  normalizePaginatedResponse: (data: unknown) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null && 'results' in data) {
      const results = (data as { results: unknown }).results;
      return Array.isArray(results) ? results : [];
    }
    return [];
  },
}));

// ChatToolsPanel só renderiza quando um painel está ativo; não precisa no teste.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const account = { id: 'acc-1', username: 'lojateste' };

const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  participant_id: 'ig-123',
  participant_username: 'cliente',
  participant_name: 'Cliente Teste',
  last_message_at: '2026-07-14T12:00:00Z',
  unread_count: 0,
  status: 'active' as const,
};

const message = {
  id: 'msg-1',
  conversation: 'conv-1',
  content: 'Olá!',
  direction: 'inbound' as const,
  message_type: 'TEXT',
  created_at: '2026-07-14T12:00:00Z',
};

function renderInbox() {
  return render(
    <MemoryRouter>
      <InstagramInbox />
    </MemoryRouter>
  );
}

describe('InstagramInbox — acessibilidade dos controles icon-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom não implementa scrollIntoView, usado num efeito ao carregar mensagens.
    Element.prototype.scrollIntoView = jest.fn();
    (instagramAccountService.list as jest.Mock).mockResolvedValue({ data: [account] });
    (instagramDirectService.getConversations as jest.Mock).mockResolvedValue({
      data: [conversation],
    });
    (instagramDirectService.getMessages as jest.Mock).mockResolvedValue({ data: [message] });
    (instagramDirectService.markAsRead as jest.Mock).mockResolvedValue({ data: conversation });
  });

  it('expõe nome acessível no botão de enviar mensagem', async () => {
    renderInbox();
    // A conversa é auto-selecionada, então a área de resposta é renderizada.
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });

  it('expõe nome acessível no campo de digitar mensagem', async () => {
    renderInbox();
    const campo = await screen.findByRole('textbox', { name: /mensagem/i });
    expect(campo).toBeInTheDocument();
  });

  it('expõe nome acessível no botão de atualizar conversas', async () => {
    renderInbox();
    const atualizar = await screen.findByRole('button', { name: /atualizar conversas/i });
    expect(atualizar).toBeInTheDocument();
  });

  it('expõe nome acessível no campo de busca de conversas', async () => {
    renderInbox();
    const busca = await screen.findByRole('textbox', { name: /buscar conversas/i });
    expect(busca).toBeInTheDocument();
  });

  it('expõe nome acessível no seletor de conta do Instagram', async () => {
    renderInbox();
    const conta = await screen.findByRole('combobox', { name: /conta do instagram/i });
    expect(conta).toBeInTheDocument();
  });
});
