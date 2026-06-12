import { getStageStart, getAvgPrepMinutes } from '../orderSla';

const NOW = new Date('2026-06-11T12:00:00Z');

describe('orderSla', () => {
  describe('getStageStart', () => {
    it('pedido em preparo conta desde preparing_at', () => {
      const order = {
        status: 'preparing',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
        preparing_at: '2026-06-11T11:20:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:20:00Z');
    });

    it('em preparo sem preparing_at cai para confirmed_at', () => {
      const order = {
        status: 'preparing',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:10:00Z');
    });

    it('pendente conta desde created_at', () => {
      const order = { status: 'pending', created_at: '2026-06-11T11:00:00Z' };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:00:00Z');
    });

    it('confirmado conta desde confirmed_at', () => {
      const order = {
        status: 'confirmed',
        created_at: '2026-06-11T11:00:00Z',
        confirmed_at: '2026-06-11T11:10:00Z',
      };
      expect(getStageStart(order as never)).toBe('2026-06-11T11:10:00Z');
    });
  });

  describe('getAvgPrepMinutes', () => {
    it('média de ready_at - confirmed_at dos pedidos com ambos timestamps', () => {
      const orders = [
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:20:00Z' }, // 20min
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:40:00Z' }, // 40min
        { confirmed_at: '2026-06-11T10:00:00Z' }, // sem ready_at — ignora
        { ready_at: '2026-06-11T10:30:00Z' }, // sem confirmed_at — ignora
      ];
      expect(getAvgPrepMinutes(orders as never)).toBe(30);
    });

    it('sem dados suficientes retorna null', () => {
      expect(getAvgPrepMinutes([] as never)).toBeNull();
      expect(getAvgPrepMinutes([{ confirmed_at: '2026-06-11T10:00:00Z' }] as never)).toBeNull();
    });

    it('ignora duração negativa (timestamps inconsistentes)', () => {
      const orders = [
        { confirmed_at: '2026-06-11T10:30:00Z', ready_at: '2026-06-11T10:00:00Z' }, // negativo
        { confirmed_at: '2026-06-11T10:00:00Z', ready_at: '2026-06-11T10:10:00Z' }, // 10min
      ];
      expect(getAvgPrepMinutes(orders as never)).toBe(10);
    });
  });
});
