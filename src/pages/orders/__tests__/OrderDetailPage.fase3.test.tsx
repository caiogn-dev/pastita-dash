import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Order, Payment } from '../../../types';

// ---- Mocks (antes dos imports do componente) ----
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: 'o1', storeId: 'loja-1' }),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockGetOrder = jest.fn();
const mockGetByOrder = jest.fn();
const mockGeneratePayment = jest.fn();
jest.mock('../../../services', () => ({
  __esModule: true,
  ordersService: {
    getOrder: (...a: unknown[]) => mockGetOrder(...a),
    generatePayment: (...a: unknown[]) => mockGeneratePayment(...a),
    updateStatus: jest.fn(),
  },
  paymentsService: {
    getByOrder: (...a: unknown[]) => mockGetByOrder(...a),
  },
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ store: { id: 'loja-1', name: 'Loja Teste', slug: 'loja-1' }, stores: [{ id: 'loja-1', slug: 'loja-1', name: 'Loja Teste' }] }),
}));

jest.mock('../../../components/orders/OrderPrint', () => ({
  __esModule: true,
  useOrderPrint: () => ({ printOrder: jest.fn() }),
}));
jest.mock('../../../components/OrderDeliveryModal', () => ({ __esModule: true, OrderDeliveryModal: () => null }));
jest.mock('../../../components/orders/EditOrderDrawer', () => ({ __esModule: true, EditOrderDrawer: () => null }));

import { OrderDetailPage } from '../OrderDetailPage';

const baseOrder: Order = {
  id: 'o1',
  order_number: '1001',
  store: 'loja-1',
  customer_name: 'Maria Souza',
  customer_phone: '63999990000',
  items: [],
  subtotal: 50,
  tax: 0,
  delivery_fee: 0,
  discount: 0,
  total: 50,
  status: 'confirmed',
  payment_status: 'pending',
  created_at: '2026-06-25T12:00:00Z',
  updated_at: '2026-06-25T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetByOrder.mockResolvedValue([]);
});

describe('OrderDetailPage — Fase 3 (F2 banner)', () => {
  it('mostra "Falta receber" quando amount_due > 0', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30, is_fully_paid: false });
    render(<OrderDetailPage />);
    expect(await screen.findByText('Falta receber')).toBeInTheDocument();
  });

  it('mostra "Pago integralmente" quando amount_due = 0 / is_fully_paid', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 50, amount_due: 0, is_fully_paid: true });
    render(<OrderDetailPage />);
    expect(await screen.findByText('Pago integralmente')).toBeInTheDocument();
    expect(screen.queryByText('Falta receber')).not.toBeInTheDocument();
  });
});

describe('OrderDetailPage — Fase 3 (F3 gerar cobrança PIX)', () => {
  it('gera cobrança com amount = amount_due e exibe pix copia-e-cola, QR e link', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30, is_fully_paid: false });
    mockGeneratePayment.mockResolvedValue({
      payment: { pix_code: 'PIXCOPIACOLA123', pix_qr_code: 'QRBASE64', ticket_url: 'https://mp/ticket' },
      order: { ...baseOrder, amount_paid: 20, amount_due: 30 },
    });

    render(<OrderDetailPage />);

    // valor default = amount_due
    const input = (await screen.findByLabelText('Valor da cobrança')) as HTMLInputElement;
    expect(input.value).toBe('30');

    fireEvent.click(screen.getByRole('button', { name: /Gerar cobrança PIX/i }));

    await waitFor(() => expect(mockGeneratePayment).toHaveBeenCalledWith('o1', { amount: 30, payment_method: 'pix' }));

    expect(await screen.findByText('PIXCOPIACOLA123')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code PIX')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir link de pagamento/i })).toHaveAttribute('href', 'https://mp/ticket');
  });

  it('permite editar o valor antes de gerar', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30, is_fully_paid: false });
    mockGeneratePayment.mockResolvedValue({ payment: { pix_code: 'X' }, order: { ...baseOrder, amount_due: 30 } });

    render(<OrderDetailPage />);
    const input = (await screen.findByLabelText('Valor da cobrança')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar cobrança PIX/i }));

    await waitFor(() => expect(mockGeneratePayment).toHaveBeenCalledWith('o1', { amount: 15, payment_method: 'pix' }));
  });

  it('copia o código PIX para a área de transferência', async () => {
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30, is_fully_paid: false });
    mockGeneratePayment.mockResolvedValue({ payment: { pix_code: 'COPIAME' }, order: { ...baseOrder, amount_due: 30 } });

    render(<OrderDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Gerar cobrança PIX/i }));
    const copyBtn = await screen.findByRole('button', { name: /Copiar/i });
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('COPIAME');
  });
});

describe('OrderDetailPage — Fase 3 (F4 lista de cobranças)', () => {
  it('renderiza todas as cobranças do pedido com valor e status', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30, is_fully_paid: false });
    const payments: Payment[] = [
      { id: 'p1', order: 'o1', gateway: 'mp', external_id: 'e1', amount: 20, status: 'paid', payment_method: 'pix', created_at: '', updated_at: '' },
      { id: 'p2', order: 'o1', gateway: 'mp', external_id: 'e2', amount: 30, status: 'pending', payment_method: 'pix', created_at: '', updated_at: '' },
    ];
    mockGetByOrder.mockResolvedValue(payments);

    render(<OrderDetailPage />);

    await screen.findByText('Cobranças');
    // 2 cobranças renderizadas (PIX duas vezes na lista)
    expect(screen.getAllByText('PIX').length).toBeGreaterThanOrEqual(2);
    // status de cada cobrança aparece (Pago + Pendente)
    expect(screen.getAllByText('Pago').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1);
    // valores das cobranças aparecem
    const valores = screen.getAllByText((_, el) => {
      const t = el?.textContent?.replace(/\s/g, '');
      return t === 'R$20,00' || t === 'R$30,00';
    });
    expect(valores.length).toBeGreaterThanOrEqual(2);
  });
});
