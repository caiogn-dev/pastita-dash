import { textoDeDivulgacao } from '../divulgacaoDoCupom';

const base = { code: 'VOLTA10', discount_type: 'percentage' as const, discount_value: 10, min_purchase: 0, valid_until: '2026-11-30T23:59:00-03:00' };

describe('textoDeDivulgacao', () => {
  it('código, desconto, validade e o link do cardápio', () => {
    const t = textoDeDivulgacao(base, 'https://cardapidex.com.br/ce-saladas');
    expect(t).toContain('VOLTA10');
    expect(t).toContain('10% de desconto');
    expect(t).toContain('até 30/11');
    expect(t).toContain('https://cardapidex.com.br/ce-saladas');
  });

  it('valor fixo em reais e pedido mínimo quando existe', () => {
    const t = textoDeDivulgacao({ ...base, discount_type: 'fixed', discount_value: 15, min_purchase: 60 }, null);
    expect(t).toMatch(/R\$\s?15,00 de desconto/);
    expect(t).toMatch(/pedidos a partir de R\$\s?60,00/);
    expect(t).not.toContain('http');
  });
});
