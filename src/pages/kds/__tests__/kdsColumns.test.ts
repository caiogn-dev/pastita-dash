import { groupKdsOrders, KDS_COLUMNS } from '../kdsColumns';

const order = (id: string, status: string) => ({ id, status, created_at: '2026-06-12T10:00:00Z' });

describe('kdsColumns', () => {
  it('tem 3 colunas: a iniciar, preparando, pronto', () => {
    expect(KDS_COLUMNS.map((c) => c.id)).toEqual(['todo', 'preparing', 'ready']);
  });

  it('agrupa pedidos por etapa de cozinha', () => {
    const grouped = groupKdsOrders([
      order('1', 'confirmed'),
      order('2', 'paid'),
      order('3', 'preparing'),
      order('4', 'ready'),
      order('5', 'out_for_delivery'),
    ] as never);
    expect(grouped.todo.map((o) => o.id)).toEqual(['1', '2']);
    expect(grouped.preparing.map((o) => o.id)).toEqual(['3']);
    expect(grouped.ready.map((o) => o.id)).toEqual(['4']);
  });

  it('ignora pedidos fora do fluxo de cozinha (pending, entregue, cancelado)', () => {
    const grouped = groupKdsOrders([
      order('1', 'pending'),
      order('2', 'delivered'),
      order('3', 'cancelled'),
      order('4', 'completed'),
    ] as never);
    expect(grouped.todo).toHaveLength(0);
    expect(grouped.preparing).toHaveLength(0);
    expect(grouped.ready).toHaveLength(0);
  });

  it('ordena cada coluna do mais antigo para o mais novo (fila de produção)', () => {
    const grouped = groupKdsOrders([
      { id: 'novo', status: 'preparing', created_at: '2026-06-12T12:00:00Z' },
      { id: 'velho', status: 'preparing', created_at: '2026-06-12T10:00:00Z' },
    ] as never);
    expect(grouped.preparing.map((o) => o.id)).toEqual(['velho', 'novo']);
  });
});
