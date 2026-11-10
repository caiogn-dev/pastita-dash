/**
 * Diagnóstico do chat: o cartão de conversa e o botão de atualizar as mensagens
 * precisam funcionar por teclado e ter nome para o leitor de tela.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const getConversations = jest.fn();
const getMessages = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getConversations: (...a: unknown[]) => getConversations(...a),
    getMessages: (...a: unknown[]) => getMessages(...a),
  },
}));
jest.mock('../../../services/intents', () => ({
  __esModule: true,
  intentService: { getLogs: jest.fn().mockResolvedValue({ results: [] }) },
}));
jest.mock('../../../services/automation', () => ({
  __esModule: true,
  automationLogService: { list: jest.fn().mockResolvedValue({ results: [] }) },
}));

import DebugDashboardPage from '../DebugDashboardPage';

describe('DebugDashboardPage — acessibilidade', () => {
  beforeEach(() => {
    getConversations.mockResolvedValue({
      results: [{ id: 'c1', contact_name: 'Maria', phone_number: '5511', mode: 'auto', status: 'open' }],
    });
    getMessages.mockResolvedValue({ results: [] });
  });

  it('abre a conversa pelo teclado e o botão de atualizar tem nome', async () => {
    render(<DebugDashboardPage />);

    const cartao = await screen.findByRole('button', { name: /mensagens de maria/i });
    fireEvent.keyDown(cartao, { key: 'Enter' });

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith('c1'));
    const atualizar = await screen.findByRole('button', { name: /atualizar mensagens/i });

    getMessages.mockClear();
    fireEvent.click(atualizar);
    await waitFor(() => expect(getMessages).toHaveBeenCalledWith('c1'));
  });
});
