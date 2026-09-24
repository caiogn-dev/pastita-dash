// src/services/__tests__/billing.test.ts
import api from '../api';
import {
  getSubscription, cancelSubscription, changePlan, getCurrentInvoice, listInvoices,
  getAdicionais, contratarAdicional, cancelarAdicional, ehAdicionalNecessario,
} from '../billing';

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

describe('adicionais (Etiqueta ANVISA)', () => {
  it('getAdicionais lê o catálogo de adicionais da vitrine pública', async () => {
    const etiqueta = {
      key: 'etiqueta_anvisa', nome: 'Etiqueta nutricional ANVISA', descricao: 'd',
      inclui: ['TACO'], implantacao: 390, mensal: 79, anual: 790,
    };
    mockGet.mockResolvedValueOnce({ data: { plans: [], adicionais: [etiqueta] } });
    const res = await getAdicionais();
    expect(mockGet).toHaveBeenCalledWith('/public/plans/', { skipAutoLogout: true });
    expect(res).toEqual([etiqueta]);
  });

  it('getAdicionais devolve [] quando o backend ainda não manda adicionais', async () => {
    mockGet.mockResolvedValueOnce({ data: { plans: [] } });
    expect(await getAdicionais()).toEqual([]);
  });

  it('contratarAdicional faz POST e devolve a lista atualizada', async () => {
    mockPost.mockResolvedValueOnce({ data: { adicionais: ['etiqueta_anvisa'] } });
    const res = await contratarAdicional('loja', 'etiqueta_anvisa');
    expect(mockPost).toHaveBeenCalledWith('/stores/loja/subscription/adicionais/', { adicional: 'etiqueta_anvisa' });
    expect(res).toEqual(['etiqueta_anvisa']);
  });

  it('cancelarAdicional faz DELETE com o corpo', async () => {
    const mockDelete = (api as unknown as { delete: jest.Mock }).delete;
    mockDelete.mockResolvedValueOnce({ data: { adicionais: [] } });
    const res = await cancelarAdicional('loja', 'etiqueta_anvisa');
    expect(mockDelete).toHaveBeenCalledWith('/stores/loja/subscription/adicionais/', { data: { adicional: 'etiqueta_anvisa' } });
    expect(res).toEqual([]);
  });

  it('ehAdicionalNecessario reconhece o 402 do portão e ignora outros erros', () => {
    const portao = { response: { status: 402, data: { error: { code: 'adicional_necessario' } } } };
    expect(ehAdicionalNecessario(portao)).toBe(true);
    expect(ehAdicionalNecessario({ response: { status: 403, data: {} } })).toBe(false);
    expect(ehAdicionalNecessario(new Error('rede'))).toBe(false);
  });
});
