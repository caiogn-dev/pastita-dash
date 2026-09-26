import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const mockLoja = {
  id: 'loja-1',
  slug: 'loja-1',
  metadata: {
    respostas_rapidas: [
      { atalho: 'frete', texto: 'Oi {nome}, o frete sai R$ 5.' },
      { atalho: 'fechado', texto: 'Hoje estamos fechados.' },
    ],
  },
};

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({
    storeId: 'loja-1',
    storeSlug: 'loja-1',
    storeName: 'Loja Teste',
    store: mockLoja,
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

describe('respostas rápidas no composer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().setConversations([]);
    getConversations.mockResolvedValue({ results: [conversation] });
    getMessages.mockResolvedValue({ results: [] });
  });

  const caixa = () => screen.findByPlaceholderText(/digite uma mensagem/i) as Promise<HTMLInputElement>;

  it('"/" mostra as respostas da loja junto dos comandos', async () => {
    renderPage();
    fireEvent.change(await caixa(), { target: { value: '/' } });
    expect(screen.getByText('Respostas rápidas')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /\/frete/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /\/pix/ })).toBeInTheDocument();
  });

  it('filtra enquanto digita', async () => {
    renderPage();
    fireEvent.change(await caixa(), { target: { value: '/fe' } });
    expect(screen.getByRole('option', { name: /\/fechado/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /\/frete/ })).not.toBeInTheDocument();
  });

  it('Enter insere o texto com o nome da cliente e NÃO envia', async () => {
    renderPage();
    const input = await caixa();
    fireEvent.change(input, { target: { value: '/fr' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('Oi Cliente, o frete sai R$ 5.');
    const whatsapp = jest.requireMock('../../../services/whatsapp');
    expect(whatsapp.sendMessage).not.toHaveBeenCalled();
  });

  it('clicar na resposta também insere', async () => {
    renderPage();
    const input = await caixa();
    fireEvent.change(input, { target: { value: '/' } });
    fireEvent.click(screen.getByRole('option', { name: /\/fechado/ }));
    expect(input.value).toBe('Hoje estamos fechados.');
  });
});
