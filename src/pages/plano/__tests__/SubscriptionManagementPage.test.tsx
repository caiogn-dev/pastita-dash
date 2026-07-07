import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockGetSubscription = jest.fn();
const mockGetPlans = jest.fn();
const mockChangePlan = jest.fn();
const mockCancelSubscription = jest.fn();
const mockGetCurrentInvoice = jest.fn();
const mockListInvoices = jest.fn();

jest.mock('../../../services/billing', () => ({
  __esModule: true,
  getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
  getPlans: (...a: unknown[]) => mockGetPlans(...a),
  changePlan: (...a: unknown[]) => mockChangePlan(...a),
  cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
  getCurrentInvoice: (...a: unknown[]) => mockGetCurrentInvoice(...a),
  listInvoices: (...a: unknown[]) => mockListInvoices(...a),
}));

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'loja-1' } }),
}));

import SubscriptionManagementPage from '../SubscriptionManagementPage';

const BASE_SUB = {
  status: 'active' as const,
  plan: 'pro' as const,
  current_period_end: '2026-08-01T00:00:00Z',
};

const BASE_PLANS = [
  { key: 'free', name: 'Grátis', setup_fee: 0, monthly_price: 0, limits: {} },
  {
    key: 'pro',
    name: 'Pro',
    setup_fee: 0,
    monthly_price: 100,
    annual_price: 1000,
    limits: {},
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListInvoices.mockResolvedValue([]);
});

describe('SubscriptionManagementPage — fatura atual + histórico + toggle', () => {
  it('mostra o PixInvoicePanel quando há fatura pendente', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue({
      id: 'inv1',
      amount: 100,
      status: 'pending',
      kind: 'monthly',
      pix_code: '00020126-copia-cola',
      pix_qr_code: 'base64qr',
      ticket_url: 'https://mp/ticket',
      expires_at: '2026-07-10T00:00:00Z',
      period_key: '2026-07',
      paid_at: null,
    });

    render(<SubscriptionManagementPage />);

    expect(await screen.findByText('00020126-copia-cola')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute(
      'href',
      'https://mp/ticket',
    );
  });

  it('mostra estado "em dia" quando a fatura atual já foi paga', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue({
      id: 'inv1',
      amount: 100,
      status: 'completed',
      kind: 'monthly',
      pix_code: null,
      pix_qr_code: null,
      ticket_url: null,
      expires_at: null,
      period_key: '2026-07',
      paid_at: '2026-07-02T00:00:00Z',
    });

    render(<SubscriptionManagementPage />);

    expect(await screen.findByText(/em dia/i)).toBeInTheDocument();
    expect(screen.queryByText(/PIX copia e cola/i)).not.toBeInTheDocument();
  });

  it('não renderiza seção de fatura quando getCurrentInvoice retorna null', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalled());
    expect(screen.queryByText(/em dia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PIX copia e cola/i)).not.toBeInTheDocument();
  });

  it('alterna para "anual" e exibe o preço anual do plano pago', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetPlans).toHaveBeenCalled());
    expect(await screen.findByText(/R\$ 100.00/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /anual/i }));

    expect(await screen.findByText(/R\$ 1000.00/)).toBeInTheDocument();
    expect(screen.getByText(/2 meses grátis/i)).toBeInTheDocument();
  });

  it('mostra aviso de cobrança anual em breve só no ciclo anual', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetPlans).toHaveBeenCalled());
    expect(
      screen.queryByText(/Cobrança anual chega em breve/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /anual/i }));

    expect(
      await screen.findByText(/Cobrança anual chega em breve — por enquanto a assinatura é mensal\./i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mensal/i }));

    expect(
      screen.queryByText(/Cobrança anual chega em breve/i),
    ).not.toBeInTheDocument();
  });

  it('exibe o histórico de faturas quando listInvoices retorna itens', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);
    mockListInvoices.mockResolvedValue([
      {
        id: 'inv-old',
        amount: 100,
        status: 'completed',
        kind: 'monthly',
        pix_code: null,
        pix_qr_code: null,
        ticket_url: null,
        expires_at: null,
        period_key: '2026-06',
        paid_at: '2026-06-02T00:00:00Z',
      },
    ]);

    render(<SubscriptionManagementPage />);

    expect(await screen.findByText('2026-06')).toBeInTheDocument();
  });

  it('faz polling da fatura atual a cada 15s enquanto pendente', async () => {
    jest.useFakeTimers();
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue({
      id: 'inv1',
      amount: 100,
      status: 'pending',
      kind: 'monthly',
      pix_code: 'codigo-x',
      pix_qr_code: null,
      ticket_url: null,
      expires_at: null,
      period_key: '2026-07',
      paid_at: null,
    });

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(2));

    jest.useRealTimers();
  });

  it('para o polling após a fatura ficar paga', async () => {
    jest.useFakeTimers();
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice
      .mockResolvedValueOnce({
        id: 'inv1',
        amount: 100,
        status: 'pending',
        kind: 'monthly',
        pix_code: 'codigo-x',
        pix_qr_code: null,
        ticket_url: null,
        expires_at: null,
        period_key: '2026-07',
        paid_at: null,
      })
      .mockResolvedValue({
        id: 'inv1',
        amount: 100,
        status: 'completed',
        kind: 'monthly',
        pix_code: 'codigo-x',
        pix_qr_code: null,
        ticket_url: null,
        expires_at: null,
        period_key: '2026-07',
        paid_at: '2026-07-05T00:00:00Z',
      });

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/em dia/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('para o polling quando a fatura atual está cancelled/failed (status terminal sem ser paga)', async () => {
    jest.useFakeTimers();
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue({
      id: 'inv1',
      amount: 100,
      status: 'cancelled',
      kind: 'monthly',
      pix_code: 'codigo-x',
      pix_qr_code: null,
      ticket_url: null,
      expires_at: null,
      period_key: '2026-07',
      paid_at: null,
    });

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(1));

    // Status já é terminal (cancelled) desde a primeira busca: o intervalo é
    // limpo imediatamente, então nenhuma chamada extra deve ocorrer.
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('limpa o intervalo de polling ao desmontar', async () => {
    jest.useFakeTimers();
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue({
      id: 'inv1',
      amount: 100,
      status: 'pending',
      kind: 'monthly',
      pix_code: 'codigo-x',
      pix_qr_code: null,
      ticket_url: null,
      expires_at: null,
      period_key: '2026-07',
      paid_at: null,
    });

    const { unmount } = render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(1));

    const callsBeforeUnmount = mockGetCurrentInvoice.mock.calls.length;

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(mockGetCurrentInvoice).toHaveBeenCalledTimes(callsBeforeUnmount);

    jest.useRealTimers();
  });
});
