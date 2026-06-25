import { ordersService } from '../orders';
import { paymentsService } from '../payments';
import ordersApi from '../orders';
import paymentsApiMod from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  normalizePaginatedEnvelope: (data: unknown) => {
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data };
    }
    if (typeof data === 'object' && data !== null && 'results' in data) {
      return data as Record<string, unknown>;
    }
    return { count: 0, next: null, previous: null, results: [] };
  },
}));

const mockPost = (paymentsApiMod as unknown as { post: jest.Mock }).post;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ordersService.generatePayment (Fase 3)', () => {
  it('usa a rota SLUG e envia amount + payment_method quando informados', async () => {
    mockPost.mockResolvedValueOnce({ data: { payment: { pix_code: 'abc' }, order: { id: 'o1', total: '50.00', subtotal: '50.00', discount: '0', tax: '0', items: [] } } });

    await ordersService.generatePayment('o1', { amount: 12.5, payment_method: 'pix' }, 'minha-loja');

    expect(mockPost).toHaveBeenCalledWith(
      '/stores/minha-loja/orders/o1/generate_payment/',
      { amount: 12.5, payment_method: 'pix' },
    );
  });

  it('não envia amount quando não informado (default = amount_due no backend)', async () => {
    mockPost.mockResolvedValueOnce({ data: { payment: {}, order: { id: 'o1', total: '50.00', subtotal: '50.00', discount: '0', tax: '0', items: [] } } });

    await ordersService.generatePayment('o1', { payment_method: 'pix' });

    const body = mockPost.mock.calls[0][1];
    expect(body).not.toHaveProperty('amount');
    expect(body).toEqual({ payment_method: 'pix' });
  });

  it('retorna order normalizado (total numérico)', async () => {
    mockPost.mockResolvedValueOnce({ data: { payment: {}, order: { id: 'o1', total: '50.00', subtotal: '50.00', discount: '0', tax: '0', items: [] } } });

    const { order } = await ordersService.generatePayment('o1', {});
    expect(order.total).toBe(50);
  });
});

describe('paymentsService.createPaymentLink (Fase 3 — avulso)', () => {
  it('faz POST /stores/payments/create_link/ com store + amount + description', async () => {
    mockPost.mockResolvedValueOnce({ data: { payment: { pix_code: 'xyz' }, store_payment: { id: 'sp1', order: null } } });

    await paymentsService.createPaymentLink({
      store: 'loja-1',
      amount: 30,
      description: 'Cobrança avulsa',
      payer_name: 'João',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/stores/payments/create_link/',
      { store: 'loja-1', amount: 30, description: 'Cobrança avulsa', payer_name: 'João' },
    );
  });

  it('retorna payment + store_payment', async () => {
    mockPost.mockResolvedValueOnce({ data: { payment: { pix_code: 'xyz' }, store_payment: { id: 'sp1', order: null } } });

    const res = await paymentsService.createPaymentLink({ store: 'loja-1', amount: 30 });
    expect(res.payment).toEqual({ pix_code: 'xyz' });
    expect(res.store_payment).toEqual({ id: 'sp1', order: null });
  });
});

// Mantém a referência ao default export para garantir importação válida
void ordersApi;
