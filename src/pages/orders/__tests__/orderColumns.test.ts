import { COLUMNS, statusToColumn, resolveFocusColumn } from '../orderColumns';

describe('orderColumns', () => {
  it('mapeia status cru para coluna do kanban', () => {
    expect(statusToColumn('pending')).toBe('pending');
    expect(statusToColumn('paid')).toBe('confirmed');
    expect(statusToColumn('preparing')).toBe('preparing');
    expect(statusToColumn('OUT_FOR_DELIVERY')).toBe('dispatch');
    expect(statusToColumn('completed')).toBe('done');
  });

  it('status desconhecido cai na coluna pending (entrada do funil)', () => {
    expect(statusToColumn('whatever')).toBe('pending');
  });

  it('resolveFocusColumn aceita status cru ou id de coluna', () => {
    expect(resolveFocusColumn('pending')).toBe('pending');
    expect(resolveFocusColumn('paid')).toBe('confirmed');
    expect(resolveFocusColumn('dispatch')).toBe('dispatch');
  });

  it('resolveFocusColumn retorna null para vazio/desconhecido (sem filtro)', () => {
    expect(resolveFocusColumn(null)).toBeNull();
    expect(resolveFocusColumn('')).toBeNull();
    expect(resolveFocusColumn('xyz')).toBeNull();
  });

  it('COLUMNS mantém as 5 colunas do fluxo', () => {
    expect(COLUMNS.map((c) => c.id)).toEqual(['pending', 'confirmed', 'preparing', 'dispatch', 'done']);
  });
});
