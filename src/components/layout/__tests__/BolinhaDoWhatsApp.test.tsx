/**
 * Bolinha do WhatsApp: responder o WhatsApp sem sair da tela em que se está,
 * no mesmo espírito da bolinha do iFood. Reaproveita o chat do Inbox (store,
 * WebSocket, balões, envio) — é navegação, não um chat novo.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const getConversations = jest.fn();
const getMessages = jest.fn();
const markAsRead = jest.fn();
const sendMessage = jest.fn();
const subscribeToConversation = jest.fn();
const unsubscribeFromConversation = jest.fn();
let mobile = false;

jest.mock('../../../services/conversations', () => ({
  conversationsService: {
    getConversations: (...a: unknown[]) => getConversations(...a),
    getMessages: (...a: unknown[]) => getMessages(...a),
    markAsRead: (...a: unknown[]) => markAsRead(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: () => '' }));
jest.mock('../../../services/whatsapp', () => ({ sendMessage: (...a: unknown[]) => sendMessage(...a) }));
jest.mock('../../../context/WhatsAppWsContext', () => ({
  useWhatsAppWsContext: () => ({ subscribeToConversation, unsubscribeFromConversation }),
}));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ storeSlug: 'ce-saladas' }) }));
jest.mock('../../../mobile/useIsMobileViewport', () => ({ useIsMobileViewport: () => mobile }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('../../chat/MessageBubble', () => ({
  MessageBubble: ({ textBody }: { textBody?: string }) => <div data-testid="balao">{textBody}</div>,
}));

import { BolinhaDoWhatsApp } from '../BolinhaDoWhatsApp';
import { useChatStore } from '../../../stores/chatStore';

const conversas = [
  { id: 'c1', account: 'acc-1', phone_number: '5563999990001', contact_name: 'Maria', unread_count: 2, last_message_preview: 'quero uma salada', last_message_at: '2026-11-23T20:00:00Z' },
  { id: 'c2', account: 'acc-1', phone_number: '5563999990002', contact_name: 'João', unread_count: 1, last_message_preview: 'tem entrega?', last_message_at: '2026-11-23T19:00:00Z' },
  { id: 'c3', account: 'acc-1', phone_number: '5563999990003', contact_name: 'Ana', unread_count: 0, last_message_preview: 'obrigada', last_message_at: '2026-11-23T18:00:00Z' },
];

const OndeEstou = () => <div data-testid="rota">{useLocation().pathname + useLocation().search}</div>;

const montar = (rota = '/orders') => render(
  <MemoryRouter initialEntries={[rota]}>
    <BolinhaDoWhatsApp />
    <Routes><Route path="*" element={<OndeEstou />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  mobile = false;
  useChatStore.getState().reset();
  [getConversations, getMessages, markAsRead, sendMessage, subscribeToConversation, unsubscribeFromConversation]
    .forEach((f) => f.mockReset());
  getConversations.mockResolvedValue({ results: conversas, next: null });
  getMessages.mockResolvedValue({
    results: [
      { id: 'm1', direction: 'inbound', message_type: 'text', text_body: 'quero uma salada', created_at: '2026-11-23T20:00:00Z' },
    ],
    has_more: false,
    next_before_id: null,
  });
  markAsRead.mockResolvedValue({});
  sendMessage.mockResolvedValue({});
});

it('mostra a bolinha com o total de não lidas da loja', async () => {
  montar();
  const bolinha = await screen.findByRole('button', { name: /whatsapp.*3 não lidas/i });
  expect(bolinha).toBeInTheDocument();
  expect(getConversations).toHaveBeenCalledWith(expect.objectContaining({ store: 'ce-saladas', page: 1 }));
});

it('abre a lista de conversas e entra numa conversa marcando como lida', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  expect(screen.getByText('Maria')).toBeInTheDocument();
  expect(screen.getByText('tem entrega?')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Maria/ }));
  await waitFor(() => expect(getMessages).toHaveBeenCalledWith('c1'));
  expect(await screen.findByTestId('balao')).toHaveTextContent('quero uma salada');
  expect(markAsRead).toHaveBeenCalledWith('c1');
  expect(subscribeToConversation).toHaveBeenCalledWith('c1');
  expect(useChatStore.getState().selectedConversationId).toBe('c1');
});

it('responde pelo WhatsApp com Enter, como no Inbox', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /Maria/ }));
  const campo = await screen.findByRole('textbox', { name: /mensagem/i });
  fireEvent.change(campo, { target: { value: 'Já vou te mandar o cardápio' } });
  await act(async () => { fireEvent.keyDown(campo, { key: 'Enter' }); });
  expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    account_id: 'acc-1',
    to: '5563999990001',
    text: 'Já vou te mandar o cardápio',
  }));
  expect(campo).toHaveValue('');
});

it('Shift+Enter não envia', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /Maria/ }));
  const campo = await screen.findByRole('textbox', { name: /mensagem/i });
  fireEvent.change(campo, { target: { value: 'linha 1' } });
  fireEvent.keyDown(campo, { key: 'Enter', shiftKey: true });
  expect(sendMessage).not.toHaveBeenCalled();
});

it('voltar para a lista solta a conversa (o WebSocket volta a contar não lidas dela)', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /Maria/ }));
  await screen.findByTestId('balao');
  fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
  expect(useChatStore.getState().selectedConversationId).toBeNull();
  expect(unsubscribeFromConversation).toHaveBeenCalledWith('c1');
  expect(screen.getByText('João')).toBeInTheDocument();
});

it('"Abrir no Inbox" leva para a conversa completa e fecha a janela', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  fireEvent.click(screen.getByRole('button', { name: /Maria/ }));
  await screen.findByTestId('balao');
  fireEvent.click(screen.getByRole('button', { name: /abrir no inbox/i }));
  expect(screen.getByTestId('rota')).toHaveTextContent('/inbox/whatsapp?conversation=c1');
  expect(screen.queryByRole('textbox', { name: /mensagem/i })).not.toBeInTheDocument();
});

it('Esc fecha a janela', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: /whatsapp/i }));
  expect(screen.getByText('Maria')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByText('Maria')).not.toBeInTheDocument();
});

it('não aparece dentro do próprio Inbox', async () => {
  montar('/inbox/whatsapp');
  await act(async () => {});
  expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument();
  expect(getConversations).not.toHaveBeenCalled();
});

it('não aparece no celular (lá o Inbox já é uma aba)', async () => {
  mobile = true;
  montar();
  await act(async () => {});
  expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument();
});
