import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockCreatePaymentLink = jest.fn();
const mockGetPayments = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  paymentsService: {
    createPaymentLink: (...a: unknown[]) => mockCreatePaymentLink(...a),
    getPayments: (...a: unknown[]) => mockGetPayments(...a),
  },
  getErrorMessage: (e: unknown) => String(e),
  // A página passou a listar os pedidos em aberto para permitir vincular a
  // cobrança a um deles. Sem pedido, o pagamento entra como dinheiro sem venda.
  ordersService: { getOrders: jest.fn().mockResolvedValue({ results: [] }) },
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1', storeName: 'Loja Teste', isStoreSelected: true }),
}));

import { PaymentLinkPage } from '../PaymentLinkPage';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPayments.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
});

const cobranca = (over: Record<string, unknown> = {}) => ({
  id: 'sp-1', amount: '107.01', status: 'pending', status_display: 'Pendente',
  payment_url: 'https://mp/antigo', description: 'Sinal do evento',
  payer_name: 'Diana', created_at: '2026-08-12T15:00:00Z', paid_at: null,
  ...over,
});

describe('PaymentLinkPage — link de pagamento avulso (F5)', () => {
  it('gera link de pagamento avulso e exibe a URL para abrir/copiar', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { payment_url: 'https://mp/avulso', amount: 30 },
      store_payment: { id: 'sp1', order: null },
    });

    render(<PaymentLinkPage />);

    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), { target: { value: 'Sinal' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));

    await waitFor(() =>
      expect(mockCreatePaymentLink).toHaveBeenCalledWith({
        store: 'loja-1',
        amount: 30,
        description: 'Sinal',
      }),
    );

    expect(await screen.findByText('https://mp/avulso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute('href', 'https://mp/avulso');
  });

  it('usa init_point como fallback quando não há payment_url', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { init_point: 'https://mp/init', amount: 30 },
      store_payment: { id: 'sp1', order: null },
    });

    render(<PaymentLinkPage />);

    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));

    expect(await screen.findByText('https://mp/init')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute('href', 'https://mp/init');
  });

  it('não chama o serviço com valor inválido', async () => {
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));
    await waitFor(() => expect(mockCreatePaymentLink).not.toHaveBeenCalled());
  });

  it('envia payer opcional quando preenchido', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { payment_url: 'https://mp/x' },
      store_payment: { id: 'sp1', order: null },
    });
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Nome do pagador (opcional)'), { target: { value: 'João' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));
    await waitFor(() =>
      expect(mockCreatePaymentLink).toHaveBeenCalledWith({ store: 'loja-1', amount: 12.5, payer_name: 'João' }),
    );
  });

  // ── o que o dono reclamou: "gero o link, atualizo a página e perco ele;
  //    não sei se pagou" ──────────────────────────────────────────────────
  it('lista as cobranças já geradas ao abrir — o link sobrevive ao F5', async () => {
    mockGetPayments.mockResolvedValue({
      count: 1, next: null, previous: null, results: [cobranca()],
    });

    render(<PaymentLinkPage />);

    expect(await screen.findByText(/Sinal do evento/)).toBeInTheDocument();
    expect(screen.getByText(/107,01/)).toBeInTheDocument();
    // Pede SÓ as avulsas da loja — cobrança de pedido não é assunto desta tela.
    expect(mockGetPayments).toHaveBeenCalledWith(
      expect.objectContaining({ store: 'loja-1', sem_pedido: '1' }),
    );
  });

  it('diz se a cobrança foi paga ou ainda está aguardando', async () => {
    mockGetPayments.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [
        cobranca({ id: 'a', status: 'completed', paid_at: '2026-08-12T16:00:00Z', description: 'Paga' }),
        cobranca({ id: 'b', status: 'pending', description: 'Aberta' }),
      ],
    });

    render(<PaymentLinkPage />);

    expect(await screen.findByText(/^Pago$/)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando pagamento/)).toBeInTheDocument();
  });

  it('depois de gerar, recarrega a lista — o link novo entra no histórico', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { payment_url: 'https://mp/novo', amount: 30 },
      store_payment: { id: 'sp2', order: null },
    });

    render(<PaymentLinkPage />);
    await waitFor(() => expect(mockGetPayments).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));

    await waitFor(() => expect(mockGetPayments).toHaveBeenCalledTimes(2));
  });
});
