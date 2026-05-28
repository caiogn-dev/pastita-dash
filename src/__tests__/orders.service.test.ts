import { ordersService } from '../services/orders';
import api from '../services/api';
import { CreateOrder, Order } from '../types';

jest.mock('../services/api', () => ({
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
      return data;
    }
    return { count: 0, next: null, previous: null, results: [] };
  },
}));

const mockPost = api.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ordersService', () => {
  it('creates dashboard orders through the canonical admin orders endpoint', async () => {
    const payload: CreateOrder = {
      store: 'demo-store',
      customer_name: 'Maria Silva',
      customer_phone: '5563999999999',
      delivery_method: 'pickup',
      items: [{ product_id: 'product-1', quantity: 2 }],
      payment_method: 'pix',
    };
    const order = {
      id: 'order-1',
      subtotal: '40.00',
      discount: '0.00',
      tax: '0.00',
      total: '40.00',
      items: [],
      created_at: '2026-05-07T12:00:00Z',
      updated_at: '2026-05-07T12:00:00Z',
    } as unknown as Order;

    mockPost.mockResolvedValueOnce({ data: order });

    const result = await ordersService.createOrder(payload);

    expect(mockPost).toHaveBeenCalledWith('/stores/orders/', payload);
    expect(result.subtotal).toBe(40);
    expect(result.total).toBe(40);
  });
});
