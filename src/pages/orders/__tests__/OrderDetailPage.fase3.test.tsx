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
    // O selo encurtou para 'Pago': ele vive sob o título 'Pagamento', que já
    // dá o contexto que 'integralmente' carregava sozinho.
    expect(await screen.findByText('Pago')).toBeInTheDocument();
    expect(screen.queryByText('Falta receber')).not.toBeInTheDocument();
  });
});

describe('OrderDetailPage — método digital (link de pagamento)', () => {
  it('mostra "Link de pagamento", não "Delivery", para pedido digital', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, delivery_method: 'digital' });
    render(<OrderDetailPage />);
    expect(await screen.findByText('Link de pagamento')).toBeInTheDocument();
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument();
  });

  it('mantém "Delivery" para pedido delivery', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, delivery_method: 'delivery' });
    render(<OrderDetailPage />);
    // 'Delivery' virou 'Entrega' (ou o bairro, quando o pedido tem endereço):
    // o painel fala português com quem atende.
    // "Entrega" aparece duas vezes de propósito (o modo, e a taxa nos
    // totais); o que este teste guarda é que um pedido de entrega NÃO é
    // rotulado como link de pagamento.
    expect((await screen.findAllByText('Entrega')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Link de pagamento')).not.toBeInTheDocument();
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
      { id: 'p1', order: 'o1', gateway: 'mp', external_id: 'e1', amount: 20, status: 'completed', payment_method: 'pix', created_at: '', updated_at: '' },
      { id: 'p2', order: 'o1', gateway: 'mp', external_id: 'e2', amount: 30, status: 'pending', payment_method: 'pix', created_at: '', updated_at: '' },
    ];
    mockGetByOrder.mockResolvedValue(payments);

    render(<OrderDetailPage />);

    await screen.findByText('Pagamento');
    // Método e estado saem na MESMA linha ("PIX · Recebido"), uma linha por
    // cobrança. O vocabulário é o da COBRANÇA: ela fica `completed`
    // ("Recebido") enquanto o PEDIDO fica `paid` ("Pago") — reusar o mapa do
    // pedido aqui era o que exibia "completed" cru.
    expect(screen.getAllByText(/PIX/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Recebido/).length).toBeGreaterThanOrEqual(1);
    // 'Aguardando' e não 'Pendente': "Pendente" era o status do PEDIDO, num
    // cartão que agora mostra quanto falta receber — número, não rótulo.
    expect(screen.getAllByText(/Aguardando/).length).toBeGreaterThanOrEqual(1);
    // valores das cobranças aparecem
    const valores = screen.getAllByText((_, el) => {
      const t = el?.textContent?.replace(/\s/g, '');
      return t === 'R$20,00' || t === 'R$30,00';
    });
    expect(valores.length).toBeGreaterThanOrEqual(2);
  });
});

describe('OrderDetailPage — cobrança que caiu no fallback de link', () => {
  it('mostra o link de pagamento quando o backend devolve payment_url (sem PIX)', async () => {
    // Quando o MP recusa o PIX, o backend segue por Checkout Pro e devolve
    // `payment_url`/`init_point` — nunca `ticket_url`. Lendo só as chaves do
    // PIX, o painel mostrava uma caixa vazia e o operador ficava com um
    // "Aguardando" e nenhum link para mandar ao cliente (09/set).
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 20, amount_due: 30 });
    mockGeneratePayment.mockResolvedValue({
      payment: {
        payment_method: 'link',
        status: 'pending',
        payment_url: 'https://mp.com/checkout/abc',
        init_point: 'https://mp.com/checkout/abc',
        pix_fallback: true,
      },
      order: { ...baseOrder, amount_due: 30 },
    });

    render(<OrderDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Gerar cobrança PIX/i }));

    const link = await screen.findByRole('link', { name: /Abrir link de pagamento/i });
    expect(link).toHaveAttribute('href', 'https://mp.com/checkout/abc');
  });
});

describe('OrderDetailPage — lista de cobranças', () => {
  it('dá o link da cobrança pendente na própria linha', async () => {
    // Sem isto o link só existia no instante em que a cobrança era gerada:
    // ao reabrir o pedido, a lista mostrava "Aguardando R$ 57,73" e o
    // operador não tinha o que mandar para o cliente.
    mockGetOrder.mockResolvedValue({ ...baseOrder, amount_paid: 0, amount_due: 57.73 });
    mockGetByOrder.mockResolvedValue([
      {
        id: 'p1', order: 'o1', gateway: '', external_id: 'pref-1',
        amount: 57.73, status: 'pending', payment_method: 'other',
        payment_url: 'https://mp.com/checkout/abc',
        created_at: '2026-09-09T14:18:00Z', updated_at: '2026-09-09T14:18:00Z',
      } as unknown as Payment,
    ]);

    render(<OrderDetailPage />);

    const link = await screen.findByRole('link', { name: /Abrir cobrança/i });
    expect(link).toHaveAttribute('href', 'https://mp.com/checkout/abc');
  });
});

describe('OrderDetailPage — de onde veio o desconto', () => {
  it('mostra o cupom aplicado e o cashback usado em linhas próprias', async () => {
    // O modal só mostrava "Desconto -R$ 12,00": o cupom e o saldo gasto
    // ficavam invisíveis, embora os dois já viessem do backend. O dono
    // abria o pedido e não tinha como saber por que o valor era aquele.
    mockGetOrder.mockResolvedValue({
      ...baseOrder,
      subtotal: 45.91,
      discount: 14.59,
      coupon_code: 'SALADA10',
      total: 31.32,
      metadata: { cashback_aplicado: 10 },
    });

    render(<OrderDetailPage />);

    expect(await screen.findByText(/SALADA10/)).toBeInTheDocument();
    expect(await screen.findByText(/Cashback usado/i)).toBeInTheDocument();
    expect(await screen.findByText('-R$ 10,00')).toBeInTheDocument();
  });

  it('diz quantos pedidos o cliente já fez', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder, pedidos_do_cliente: 4 });
    render(<OrderDetailPage />);
    expect(await screen.findByText(/4º pedido na loja/i)).toBeInTheDocument();
  });

  it('não inventa histórico quando o backend não mandou a contagem', async () => {
    mockGetOrder.mockResolvedValue({ ...baseOrder });
    render(<OrderDetailPage />);
    await screen.findByText('Falta receber').catch(() => null);
    expect(screen.queryByText(/pedido deste cliente/i)).not.toBeInTheDocument();
  });
});
