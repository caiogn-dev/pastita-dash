import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
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

const semAdicional = {
  estado: 'desconhecido', liberado: true, adicional: null, ocupado: false, erro: null,
  contratar: jest.fn(), cancelar: jest.fn(),
};
const mockUseAdicional = jest.fn(() => semAdicional);
jest.mock('../../../hooks/useAdicional', () => ({
  __esModule: true,
  useAdicional: () => mockUseAdicional(),
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

  it('não oferece o ciclo anual, que ninguém consegue contratar', async () => {
    // O seletor Mensal/Anual mostrava "2 meses grátis" e um preço anual, mas a
    // assinatura saía mensal de qualquer jeito: nada no painel grava o ciclo.
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);

    render(<SubscriptionManagementPage />);

    await waitFor(() => expect(mockGetPlans).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /anual/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/2 meses grátis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chega em breve/i)).not.toBeInTheDocument();
  });

  it('cada plano diz o que inclui antes de pedir a escolha', async () => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);

    render(<SubscriptionManagementPage />);

    expect(await screen.findAllByText('Produtos no cardápio')).not.toHaveLength(0);
    expect(screen.getAllByText('Atendimento por WhatsApp').length).toBeGreaterThan(0);
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

describe('SubscriptionManagementPage — adicional Etiqueta ANVISA', () => {
  const ETIQUETA = {
    key: 'etiqueta_anvisa', nome: 'Etiqueta nutricional ANVISA', descricao: 'd',
    inclui: ['Alergênicos conforme a RDC 26'], implantacao: 390, mensal: 79, anual: 790,
  };

  beforeEach(() => {
    mockGetSubscription.mockResolvedValue(BASE_SUB);
    mockGetPlans.mockResolvedValue(BASE_PLANS);
    mockGetCurrentInvoice.mockResolvedValue(null);
  });

  afterEach(() => mockUseAdicional.mockReturnValue(semAdicional));

  it('mostra o cartão com o preço do servidor e contrata', async () => {
    const contratar = jest.fn();
    mockUseAdicional.mockReturnValue({
      ...semAdicional, estado: 'disponivel', liberado: false, adicional: ETIQUETA, contratar,
    });
    render(<SubscriptionManagementPage />);
    expect(await screen.findByText('Etiqueta nutricional ANVISA')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 390,00 de implantação/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Contratar adicional' }));
    expect(contratar).toHaveBeenCalled();
  });

  it('cancelar pede confirmação antes', async () => {
    const cancelar = jest.fn();
    mockUseAdicional.mockReturnValue({
      ...semAdicional, estado: 'contratado', adicional: ETIQUETA, cancelar,
    });
    render(<SubscriptionManagementPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar adicional' }));
    expect(cancelar).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar adicional' }));
    await waitFor(() => expect(cancelar).toHaveBeenCalled());
  });
});
