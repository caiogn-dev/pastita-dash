import {
  ofertaDoPlano,
  quantoOMarketplaceLevaria,
  formatarReais,
  type PlanoComOferta,
} from '../ofertaDoPlano';

const PRO: PlanoComOferta = {
  key: 'pro',
  name: 'Loja + WhatsApp',
  monthly_price: 249,
  annual_price: 2490,
  adesao_no_mensal: 1200,
  adesao_no_anual: 0,
  economia_no_anual: 1698,
};

describe('oferta do plano', () => {
  it('no mensal mostra o degrau real da entrada', () => {
    // R$ 1.449 é o número que trava a venda. Escondê-lo atrás de "R$ 249/mês"
    // só adia a objeção para a hora do pagamento.
    const o = ofertaDoPlano(PRO, 'monthly');
    expect(o.primeiroPagamento).toBe(1449);
    expect(o.explicacao).toContain('implantação');
    expect(o.selo).toBe('');
  });

  it('no anual o número grande é por mês, não o total', () => {
    // O dono compara mensalidade com mensalidade. Mostrar R$ 2.490 ao lado de
    // R$ 249 faz o anual parecer dez vezes mais caro.
    const o = ofertaDoPlano(PRO, 'annual');
    expect(o.valorPorMes).toBeCloseTo(207.5);
    expect(o.primeiroPagamento).toBe(2490);
    expect(o.selo).toBe('Implantação inclusa');
  });

  it('não promete implantação grátis em plano que nunca cobrou implantação', () => {
    const semAdesao = { ...PRO, adesao_no_mensal: 0 };
    expect(ofertaDoPlano(semAdesao, 'annual').selo).toBe('');
  });

  it('plano sem preço anual cai no mensal sem quebrar', () => {
    const gratis: PlanoComOferta = { key: 'free', name: 'Grátis', monthly_price: 0 };
    const o = ofertaDoPlano(gratis, 'annual');
    expect(o.primeiroPagamento).toBe(0);
    expect(o.valorPorMes).toBe(0);
  });

  it('a tela NUNCA recalcula a economia — usa a do backend', () => {
    expect(ofertaDoPlano(PRO, 'annual').economia).toBe(1698);
  });
});

describe('âncora do marketplace', () => {
  it('uma loja de R$ 9.000/mês entrega R$ 2.385 de comissão', () => {
    expect(quantoOMarketplaceLevaria(9000)).toBeCloseTo(2385);
  });
});

describe('formato', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(formatarReais(1449)).toBe('R$ 1.449,00');
    expect(formatarReais(207.5)).toBe('R$ 207,50');
  });
});
