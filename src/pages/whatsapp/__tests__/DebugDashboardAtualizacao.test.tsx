/**
 * Diagnóstico do chat: a atualização automática (5 s) não pode trocar a tela por
 * "Carregando..." — isso derrubava o painel de mensagens aberto a cada ciclo.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

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

const esperar = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

describe('DebugDashboardPage — atualização automática', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getConversations.mockResolvedValue({
      results: [{ id: 'c1', contact_name: 'Maria', phone_number: '5511', mode: 'auto', status: 'open' }],
    });
    getMessages.mockResolvedValue({
      results: [{ id: 'm1', direction: 'inbound', status: 'read', text_body: 'oi gente', created_at: '2026-01-01T10:00:00Z' }],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('mantém as mensagens abertas enquanto atualiza, sem voltar a "Carregando..."', async () => {
    render(<DebugDashboardPage />);
    await esperar();
    fireEvent.click(screen.getByRole('button', { name: /mensagens de maria/i }));
    await esperar();
    expect(screen.getByText('oi gente')).toBeInTheDocument();

    // Atualização lenta: enquanto não responde, a tela atual deve permanecer.
    let responder: (v: unknown) => void = () => undefined;
    getConversations.mockReturnValueOnce(new Promise((r) => { responder = r; }));
    await act(async () => { jest.advanceTimersByTime(5000); });

    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    expect(screen.getByText('oi gente')).toBeInTheDocument();

    await act(async () => { responder({ results: [] }); });
  });
});
