// src/services/__tests__/billing.test.ts
import api from '../api';
import { getSubscription, cancelSubscription, changePlan } from '../billing';

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
