/**
 * O direct do Instagram dentro do inbox: ler e responder sem sair do painel.
 * A janela de 24 h precisa aparecer ANTES de o atendente escrever.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DirectPage from '../DirectPage';

const listAccounts = jest.fn();
const listConversations = jest.fn();
const listMessages = jest.fn();
const sendMessage = jest.fn();
const markRead = jest.fn();

jest.mock('../../../features/channels', () => ({
  __esModule: true,
  channelsApi: {
    listAccounts: (...a: unknown[]) => listAccounts(...a),
    listConversations: (...a: unknown[]) => listConversations(...a),
    listMessages: (...a: unknown[]) => listMessages(...a),
    sendMessage: (...a: unknown[]) => sendMessage(...a),
    markRead: (...a: unknown[]) => markRead(...a),
  },
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const HORA = 60 * 60 * 1000;
const atras = (ms: number) => new Date(Date.now() - ms).toISOString();
const conversa = {
  id: 'c1', provider: 'instagram', accountId: 'a1', participantId: 'u1',
  participantName: 'Ana', participantHandle: 'ana', unreadCount: 2,
  status: 'active', lastMessageAt: atras(HORA), lastMessagePreview: 'oi',
};

beforeEach(() => {
  listAccounts.mockReset().mockResolvedValue([{ id: 'a1', provider: 'instagram', handle: 'loja', isActive: true }]);
  listConversations.mockReset().mockResolvedValue([conversa]);
  listMessages.mockReset().mockResolvedValue([
    { id: 'm1', conversationId: 'c1', direction: 'inbound', text: 'Oi, vocês entregam?', createdAt: atras(HORA) },
  ]);
  sendMessage.mockReset().mockResolvedValue({ id: 'm2', conversationId: 'c1', direction: 'outbound', text: 'entregamos sim', createdAt: atras(0) });
  markRead.mockReset().mockResolvedValue(undefined);
});

it('lista as conversas e abre a primeira', async () => {
  render(<DirectPage />);

  expect(await screen.findAllByText('Ana')).toHaveLength(2);
  expect(await screen.findByText('Oi, vocês entregam?')).toBeInTheDocument();
});

it('responde dentro da janela', async () => {
  const user = userEvent.setup();
  render(<DirectPage />);
  await screen.findByText('Oi, vocês entregam?');

  await user.type(screen.getByLabelText('Mensagem para Ana'), 'entregamos sim');
  await user.click(screen.getByRole('button', { name: 'Enviar' }));

  await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('instagram', 'c1', { text: 'entregamos sim' }));
});

it('janela fechada explica em vez de deixar escrever', async () => {
  listConversations.mockResolvedValue([{ ...conversa, lastMessageAt: atras(48 * HORA) }]);
  listMessages.mockResolvedValue([
    { id: 'm1', conversationId: 'c1', direction: 'inbound', text: 'oi', createdAt: atras(48 * HORA) },
  ]);

  render(<DirectPage />);

  expect(await screen.findByText(/A janela de 24 h fechou/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
});

it('sem conversa nenhuma, explica o que fazer', async () => {
  listConversations.mockResolvedValue([]);

  render(<DirectPage />);

  expect(await screen.findByText(/Nenhuma conversa no direct/)).toBeInTheDocument();
});
