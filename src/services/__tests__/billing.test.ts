// src/services/__tests__/billing.test.ts
import api from '../api';
import { getSubscription, cancelSubscription, changePlan, getCurrentInvoice, listInvoices } from '../billing';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = (api as unknown as { get: jest.Mock }).get;
const mockPost = (api as unknown as { post: jest.Mock }).post;

beforeEach(() => { jest.clearAllMocks(); });

describe('billing subscription service', () => {
  it('getSubscription chama o endpoint certo', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'active', plan: 'pro' } });
    const res = await getSubscription('loja');
    expect(mockGet).toHaveBeenCalledWith('/stores/loja/subscription/');
    expect(res.status).toBe('active');
  });

  it('cancelSubscription faz POST no cancel', async () => {
    mockPost.mockResolvedValueOnce({ data: { status: 'canceled' } });
    const res = await cancelSubscription('loja');
    expect(mockPost).toHaveBeenCalledWith('/stores/loja/subscription/cancel/');
    expect(res.status).toBe('canceled');
  });

  it('changePlan faz POST com o plano', async () => {
    mockPost.mockResolvedValueOnce({ data: { init_point: 'https://mp/x' } });
    const res = await changePlan('loja', 'premium');
    expect(mockPost).toHaveBeenCalledWith('/stores/loja/subscription/change-plan/', { plan: 'premium' });
    expect(res.init_point).toBe('https://mp/x');
  });
});

describe('billing invoices service', () => {
  it('getCurrentInvoice desembrulha data.invoice', async () => {
    const invoice = {
      id: 'inv_1',
      amount: 99.9,
      status: 'pending',
      kind: 'monthly',
      pix_code: '000201...copia-e-cola',
      pix_qr_code: 'base64...',
      ticket_url: null,
      expires_at: '2026-07-08T00:00:00Z',
      period_key: '2026-07',
      paid_at: null,
    };
    mockGet.mockResolvedValueOnce({ data: { invoice } });
    const res = await getCurrentInvoice('loja');
    expect(mockGet).toHaveBeenCalledWith('/stores/loja/invoices/current/');
    expect(res).toEqual(invoice);
  });

  it('getCurrentInvoice retorna null quando não há fatura', async () => {
    mockGet.mockResolvedValueOnce({ data: { invoice: null } });
    const res = await getCurrentInvoice('loja');
    expect(res).toBeNull();
  });

  it('listInvoices desembrulha data.invoices', async () => {
    const invoices = [
      {
        id: 'inv_1',
        amount: 99.9,
        status: 'completed',
        kind: 'monthly',
        pix_code: null,
        pix_qr_code: null,
        ticket_url: null,
        expires_at: null,
        period_key: '2026-06',
        paid_at: '2026-06-05T00:00:00Z',
      },
    ];
    mockGet.mockResolvedValueOnce({ data: { invoices } });
    const res = await listInvoices('loja');
    expect(mockGet).toHaveBeenCalledWith('/stores/loja/invoices/');
    expect(res).toEqual(invoices);
  });

  it('listInvoices retorna [] quando a chave está ausente', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    const res = await listInvoices('loja');
    expect(res).toEqual([]);
  });
});
