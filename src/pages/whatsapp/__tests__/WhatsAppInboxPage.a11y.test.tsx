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
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: (...args: unknown[]) => getConversations(...args),
    getMessages: (...args: unknown[]) => getMessages(...args),
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
  mode: 'auto',
  last_message_preview: '',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/inbox?conversation=conv-1']}>
      <WhatsAppInboxPage />
    </MemoryRouter>
  );

describe('WhatsAppInboxPage — acessibilidade do botão de enviar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().setConversations([]);
    getConversations.mockResolvedValue({ results: [conversation] });
    getMessages.mockResolvedValue({ results: [] });
  });

  it('expõe nome acessível no botão de enviar mensagem do compositor', async () => {
    renderPage();

    // Com ?conversation=conv-1 a página auto-seleciona a conversa e monta o
    // compositor, cujo botão de enviar é icon-only (PaperAirplaneIcon).
    const enviar = await screen.findByRole('button', { name: /enviar mensagem/i });
    expect(enviar).toBeInTheDocument();
  });
});
