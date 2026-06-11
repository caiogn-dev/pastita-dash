import { applyOrderEventToOrders } from '../orderRealtimeEvents';
import type { StoreOrder } from '../../services/storesApi';

const baseOrder = (over: Partial<StoreOrder> = {}): StoreOrder => ({
  id: 'o1',
  store: 's1',
  order_number: '100',
  customer_name: 'Ana',
  customer_email: '',
  customer_phone: '',
  status: 'pending',
  status_display: 'Pendente',
  payment_status: 'pending',
  payment_status_display: 'Pendente',
  subtotal: 10,
  discount: 0,
  coupon_code: '',
  tax: 0,
  delivery_fee: 0,
  total: 10,
  payment_method: '',
  payment_id: '',
  updated_at: '2026-06-10T10:00:00Z',
  created_at: '2026-06-10T09:00:00Z',
  ...over,
} as StoreOrder);

describe('applyOrderEventToOrders', () => {
  it('aplica patch de status no pedido existente', () => {
    const result = applyOrderEventToOrders([baseOrder()], {
      order_id: 'o1',
      status: 'confirmed',
      updated_at: '2026-06-10T10:05:00Z',
    });
    expect(result).not.toBeNull();
    expect(result![0].status).toBe('confirmed');
  });

  it('aplica payment_status e total', () => {
    const result = applyOrderEventToOrders([baseOrder()], {
      order_id: 'o1',
      payment_status: 'paid',
      total: '25.50',
      updated_at: '2026-06-10T10:05:00Z',
    });
    expect(result![0].payment_status).toBe('paid');
    expect(result![0].total).toBe(25.5);
  });

  it('retorna null para pedido desconhecido (caller deve refetch)', () => {
    const result = applyOrderEventToOrders([baseOrder()], {
      order_id: 'desconhecido',
      status: 'confirmed',
    });
    expect(result).toBeNull();
  });

  it('ignora evento mais antigo que o estado atual (out-of-order)', () => {
    const orders = [baseOrder({ updated_at: '2026-06-10T10:10:00Z' })];
    const result = applyOrderEventToOrders(orders, {
      order_id: 'o1',
      status: 'confirmed',
      updated_at: '2026-06-10T10:05:00Z',
    });
    expect(result).not.toBeNull();
    expect(result![0].status).toBe('pending'); // não sobrescreve
  });

  it('não muta o array original', () => {
    const orders = [baseOrder()];
    const result = applyOrderEventToOrders(orders, {
      order_id: 'o1',
      status: 'confirmed',
      updated_at: '2026-06-10T10:05:00Z',
    });
    expect(orders[0].status).toBe('pending');
    expect(result).not.toBe(orders);
  });

  it('retorna null sem order_id', () => {
    expect(applyOrderEventToOrders([baseOrder()], { status: 'x' })).toBeNull();
  });
});
