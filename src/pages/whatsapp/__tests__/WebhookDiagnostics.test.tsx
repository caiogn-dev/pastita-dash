import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebhookDiagnosticsPage } from '../WebhookDiagnosticsPage';

const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn() },
}));
jest.mock('@/services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('WebhookDiagnosticsPage — botão de atualizar', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      data: {
        status: 'ok',
        server_time: '2026-11-02T10:00:00Z',
        celery_status: 'ok',
        stats: {
          webhook_events: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, last_24h: 0, last_hour: 0 },
          messages: { total_inbound: 0, total_outbound: 0, inbound_last_24h: 0, inbound_last_hour: 0 },
        },
        accounts: [],
        recent_events: [],
        recent_inbound_messages: [],
        failed_events: [],
        diagnosis: {},
      },
    });
  });

  it('o botão só com ícone tem nome acessível e busca de novo ao clicar', async () => {
    render(
      <MemoryRouter>
        <WebhookDiagnosticsPage />
      </MemoryRouter>
    );
    const botao = await screen.findByRole('button', { name: /atualizar/i });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const antes = mockGet.mock.calls.length;
    fireEvent.click(botao);
    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(antes));
  });
});

describe('WebhookDiagnosticsPage — auto-refresh respeita a aba', () => {
  const dados = {
    status: 'ok', server_time: '2026-11-02T10:00:00Z', celery_status: 'ok',
    stats: {
      webhook_events: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, last_24h: 0, last_hour: 0 },
      messages: { total_inbound: 0, total_outbound: 0, inbound_last_24h: 0, inbound_last_hour: 0 },
    },
    accounts: [], recent_events: [], recent_inbound_messages: [], failed_events: [], diagnosis: {},
  };
  const definirVisibilidade = (v: 'visible' | 'hidden') =>
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });

  afterEach(() => { jest.useRealTimers(); definirVisibilidade('visible'); });

  it('busca a cada 5 s com a aba visível e para com a aba escondida', async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: dados });
    jest.useFakeTimers();
    render(<MemoryRouter><WebhookDiagnosticsPage /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('checkbox'));

    const base = mockGet.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(mockGet.mock.calls.length).toBe(base + 1);

    definirVisibilidade('hidden');
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(mockGet.mock.calls.length).toBe(base + 1);
  });

  it('sem marcar auto-refresh não busca sozinho', async () => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: dados });
    jest.useFakeTimers();
    render(<MemoryRouter><WebhookDiagnosticsPage /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    const base = mockGet.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(mockGet.mock.calls.length).toBe(base);
  });
});
