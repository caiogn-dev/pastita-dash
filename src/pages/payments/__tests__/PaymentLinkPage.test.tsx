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
  it('gera cobrança avulsa e exibe PIX copia-e-cola, QR e link', async () => {
    mockCreatePaymentLink.mockResolvedValue({
      payment: { pix_code: 'PIXAVULSO999', pix_qr_code: 'QRB64', ticket_url: 'https://mp/avulso', amount: 30 },
      store_payment: { id: 'sp1', order: null },
    });

    render(<PaymentLinkPage />);

    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), { target: { value: 'Sinal' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar cobrança PIX/i }));

    await waitFor(() =>
      expect(mockCreatePaymentLink).toHaveBeenCalledWith({
        store: 'loja-1',
        amount: 30,
        description: 'Sinal',
      }),
    );

    expect(await screen.findByText('PIXAVULSO999')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code PIX')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute('href', 'https://mp/avulso');
  });

  it('não chama o serviço com valor inválido', async () => {
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar cobrança PIX/i }));
    await waitFor(() => expect(mockCreatePaymentLink).not.toHaveBeenCalled());
  });

  it('envia payer opcional quando preenchido', async () => {
    mockCreatePaymentLink.mockResolvedValue({ payment: { pix_code: 'X' }, store_payment: { id: 'sp1', order: null } });
    render(<PaymentLinkPage />);
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Nome do pagador (opcional)'), { target: { value: 'João' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar cobrança PIX/i }));
    await waitFor(() =>
      expect(mockCreatePaymentLink).toHaveBeenCalledWith({ store: 'loja-1', amount: 12.5, payer_name: 'João' }),
    );
  });
});
