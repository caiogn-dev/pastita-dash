import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockGetCurrentInvoice = jest.fn();
jest.mock('../../../services/billing', () => ({
  __esModule: true,
  getSubscription: jest.fn().mockResolvedValue({
    status: 'active', plan: 'pro', current_period_end: '2026-08-01T00:00:00Z',
  }),
  getPlans: jest.fn().mockResolvedValue([
    { key: 'pro', name: 'Pro', setup_fee: 0, monthly_price: 100, limits: {} },
  ]),
  changePlan: jest.fn(),
  cancelSubscription: jest.fn(),
  getCurrentInvoice: (...a: unknown[]) => mockGetCurrentInvoice(...a),
  listInvoices: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'loja-1' } }),
}));
jest.mock('../../../hooks/useAdicional', () => ({
  __esModule: true,
  useAdicional: () => ({
    estado: 'desconhecido', liberado: true, adicional: null, ocupado: false, erro: null,
    contratar: jest.fn(), cancelar: jest.fn(),
  }),
}));

import SubscriptionManagementPage from '../SubscriptionManagementPage';

const pendente = {
  id: 'inv1', amount: 100, status: 'pending', kind: 'monthly', pix_code: 'copia-cola',
  pix_qr_code: 'qr', ticket_url: 'https://mp/t', expires_at: '2026-07-10T00:00:00Z',
  period_key: '2026-07', paid_at: null,
};

const definirAba = (estado: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => estado === 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('fatura pendente — consulta só com a aba visível', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetCurrentInvoice.mockReset().mockResolvedValue(pendente);
  });
  afterEach(() => {
    definirAba('visible');
    jest.useRealTimers();
  });

  it('com a aba escondida não consulta; ao voltar, consulta na hora', async () => {
    render(<SubscriptionManagementPage />);
    await act(async () => { await Promise.resolve(); });
    const aposMontar = mockGetCurrentInvoice.mock.calls.length;
    expect(aposMontar).toBeGreaterThan(0);

    definirAba('hidden');
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(aposMontar);

    definirAba('visible');
    await act(async () => { await Promise.resolve(); });
    expect(mockGetCurrentInvoice.mock.calls.length).toBeGreaterThan(aposMontar);
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });
});
