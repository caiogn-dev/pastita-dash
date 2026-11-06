import { cardsDeVendas } from '../vendasDoPeriodo';
import type { VendasDoPeriodo } from '../../../services/reports';

// Gabarito Cê 05/11: 20 pedidos, 18 pagos, 2 cancelados, R$ 496,37, ticket R$ 27,58.
const ontem: VendasDoPeriodo = {
  pedidos: 20,
  pagos: 18,
  cancelados: 2,
  cancelados_pct: 10,
  reembolsados: 0,
  faturamento: '496.37',
  frete: '89.00',
  ticket_medio: '27.58',
  por_status: { delivered: 18, cancelled: 2 },
  por_dia: [{ date: '2026-11-05', pedidos: 20, pagos: 18, cancelados: 2, faturamento: '496.37' }],
};

describe('cardsDeVendas', () => {
  it('todos os cards saem do mesmo bloco do período', () => {
    const c = cardsDeVendas(ontem);
    expect(c.pedidos).toBe(20);
    expect(c.pagos).toBe(18);
    expect(c.cancelados).toBe(2);
    expect(c.faturamento).toBeCloseTo(496.37);
    expect(c.ticketMedio).toBeCloseTo(27.58);
    expect(c.frete).toBeCloseTo(89);
    expect(c.porDia).toBe(20);
  });

  it('percentual de cancelados é sobre os pedidos do período e nunca passa de 100', () => {
    expect(cardsDeVendas(ontem).canceladosPct).toBe(10);
    expect(cardsDeVendas({ ...ontem, pedidos: 0, cancelados: 71, cancelados_pct: 7100 }).canceladosPct).toBe(0);
    expect(cardsDeVendas({ ...ontem, pedidos: 2, cancelados: 71, cancelados_pct: 0 }).canceladosPct).toBe(100);
  });

  it('pedidos por dia vêm do mesmo período, com dia vazio em zero', () => {
    const c = cardsDeVendas({
      ...ontem,
      por_dia: [
        { date: '2026-11-04', pedidos: 0, pagos: 0, cancelados: 0, faturamento: '0.00' },
        { date: '2026-11-05', pedidos: 20, pagos: 18, cancelados: 2, faturamento: '496.37' },
      ],
    });
    expect(c.serie).toEqual([
      { date: '2026-11-04', count: 0 },
      { date: '2026-11-05', count: 20 },
    ]);
    expect(c.porDia).toBe(10);
  });

  it('distribuição por status ordenada e marcando cancelado', () => {
    const c = cardsDeVendas(ontem);
    expect(c.status).toEqual([
      { status: 'delivered', value: 18, danger: false },
      { status: 'cancelled', value: 2, danger: true },
    ]);
  });

  it('sem dado ainda: tudo zero, ticket nulo', () => {
    const c = cardsDeVendas(undefined);
    expect(c.pedidos).toBe(0);
    expect(c.ticketMedio).toBeNull();
    expect(c.serie).toEqual([]);
    expect(c.status).toEqual([]);
  });
});
