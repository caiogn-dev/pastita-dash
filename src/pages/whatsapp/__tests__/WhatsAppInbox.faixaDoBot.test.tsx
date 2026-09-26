/**
 * Inbox: conversa em modo humano abre com a faixa "por que o bot parou" e o
 * que o bot já anotou; conversa com o bot não mostra faixa nenhuma.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppInboxPage from '../WhatsAppInboxPage';
import { useChatStore } from '../../../stores/chatStore';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

// services/index → api.ts usa import.meta (não parseável pelo Jest); mocka o
// que a página realmente consome.
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
  handoverService: {
    transferToHuman: jest.fn(),
    transferToBot: jest.fn(),
  },
}));

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({
    storeId: 'loja-1',
    storeSlug: 'loja-1',
    storeName: 'Loja Teste',
    store: null,
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
const getContextoDoBot = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: (...args: unknown[]) => getConversations(...args),
    getMessages: (...args: unknown[]) => getMessages(...args),
    getContextoDoBot: (...args: unknown[]) => getContextoDoBot(...args),
    markAsRead: jest.fn().mockResolvedValue({}),
  },
}));

// ChatToolsPanel só monta ao abrir um painel; isola a árvore de dependências.
jest.mock('../../../components/chat/ChatToolsPanel', () => ({
  __esModule: true,
  ChatToolsPanel: () => null,
}));

const conversation = {
  id: 'conv-1',
  account: 'acc-1',
  phone_number: '5511999999999',
  contact_name: 'Cliente Teste',
  mode: 'human',
  last_message_preview: '',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/inbox?conversation=conv-1']}>
      <WhatsAppInboxPage />
    </MemoryRouter>
  );

const CONTEXTO = {
  modo: 'human',
  motivo: { codigo: 'bot_nao_entendeu', texto: '', desde: null },
  esperando_ha_segundos: 0,
  ultima_msg_cliente: null,
  ultima_msg_atendente: null,
  carrinho: { passo: 'pagamento', itens: [{ nome: 'Lasanha', quantidade: 1, preco: 42 }], endereco: null, taxa: null, notas: null, entrega: null },
  cliente: null,
};

describe('WhatsAppInboxPage — faixa do bot em modo humano', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().setConversations([]);
    getMessages.mockResolvedValue({ results: [] });
    getContextoDoBot.mockResolvedValue(CONTEXTO);
  });

  it('modo humano: mostra o motivo e o que o bot anotou', async () => {
    getConversations.mockResolvedValue({ results: [conversation] });
    renderPage();

    expect(await screen.findByText('O bot não entendeu o cliente')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /o bot já anotou/i })).toHaveTextContent('1× Lasanha');
    expect(getContextoDoBot).toHaveBeenCalledWith('conv-1');
  });

  it('conversa com o bot: sem faixa e sem busca', async () => {
    getConversations.mockResolvedValue({ results: [{ ...conversation, mode: 'auto' }] });
    renderPage();

    await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(screen.queryByRole('region', { name: /por que o bot parou/i })).not.toBeInTheDocument();
    expect(getContextoDoBot).not.toHaveBeenCalled();
  });
});
