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

import toast from 'react-hot-toast';
import { PaymentLinkPage } from '../PaymentLinkPage';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PaymentLinkPage — link de pagamento avulso (F5)', () => {
  it('gera o link (Checkout Pro) e exibe a URL e o botão de abrir', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { payment_url: 'https://mp/checkout/avulso', amount: 30 },
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

    expect(await screen.findByText('https://mp/checkout/avulso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute(
      'href',
      'https://mp/checkout/avulso',
    );
  });

  it('usa init_point como fallback quando payment_url está ausente', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { init_point: 'https://mp/init/avulso', amount: 50 },
      store_payment: { id: 'sp2', order: null },
    });

    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));

    expect(await screen.findByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute(
      'href',
      'https://mp/init/avulso',
    );
  });

  it('exibe erro quando o backend não retorna URL de pagamento', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { amount: 30 },
      store_payment: { id: 'sp3', order: null },
    });

    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /Abrir link de pagamento/i })).not.toBeInTheDocument();
  });

  it('não chama o serviço com valor inválido', async () => {
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));
    await waitFor(() => expect(mockCreatePaymentLink).not.toHaveBeenCalled());
  });

  it('envia pagador opcional (nome e e-mail) quando preenchido', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { payment_url: 'https://mp/x' },
      store_payment: { id: 'sp4', order: null },
    });
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Nome do pagador (opcional)'), { target: { value: 'João' } });
    fireEvent.change(screen.getByLabelText('E-mail do pagador (opcional)'), {
      target: { value: 'joao@ex.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gerar link de pagamento/i }));
    await waitFor(() =>
      expect(mockCreatePaymentLink).toHaveBeenCalledWith({
        store: 'loja-1',
        amount: 12.5,
        payer_name: 'João',
        payer_email: 'joao@ex.com',
      }),
    );
  });
});
