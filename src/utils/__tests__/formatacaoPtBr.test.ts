import { formatPercentValue, variacaoComBasePequena, datasIsoParaBr, formatCurrency } from '../formatters';

describe('formatação pt-BR única', () => {
  it('percentual com vírgula', () => {
    expect(formatPercentValue(16.2)).toBe('16,2%');
    expect(formatPercentValue(16.25, 0)).toBe('16%');
    expect(formatPercentValue(null)).toBe('—');
  });
  it('dinheiro sempre com centavos', () => {
    expect(formatCurrency(74.09)).toBe('R$ 74,09');
    expect(formatCurrency(74)).toBe('R$ 74,00');
  });
  it('variação enorme é base pequena', () => {
    expect(variacaoComBasePequena(1800)).toBe(true);
    expect(variacaoComBasePequena(-100)).toBe(false);
    expect(variacaoComBasePequena(35.2)).toBe(false);
    expect(variacaoComBasePequena(null)).toBe(false);
  });
  it('data ISO em texto vira dd/mm/aaaa', () => {
    expect(datasIsoParaBr('Promo 2026-11-06')).toBe('Promo 06/11/2026');
    expect(datasIsoParaBr('A 2026-11-06 e 2026-11-07')).toBe('A 06/11/2026 e 07/11/2026');
    expect(datasIsoParaBr('2026-11-06T10:00:00')).toBe('2026-11-06T10:00:00');
    expect(datasIsoParaBr(null)).toBe('');
  });
});

import { OPCOES_DE_STATUS } from '../rotulosDeEstado';
describe('filtro de status', () => {
  it('não repete rótulo', () => {
    const r = OPCOES_DE_STATUS.map((o) => o.rotulo);
    expect(new Set(r).size).toBe(r.length);
    expect(r.filter((x) => x === 'Aguardando pagamento')).toHaveLength(1);
  });
});
