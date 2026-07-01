import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockCreatePaymentLink = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  paymentsService: { createPaymentLink: (...a: unknown[]) => mockCreatePaymentLink(...a) },
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1', storeName: 'Loja Teste', isStoreSelected: true }),
}));

import { PaymentLinkPage } from '../PaymentLinkPage';

beforeEach(() => {
  jest.clearAllMocks();
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
});
