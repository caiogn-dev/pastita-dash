/**
 * A prévia de preço só serve se bater com o que o cliente vai pagar.
 *
 * Esta é uma cópia da matemática do backend, e cópia sem teste vira divergência
 * silenciosa: a tela promete R$ 10, o checkout cobra R$ 12, e ninguém descobre
 * até o cliente reclamar. Os casos abaixo são OS MESMOS de
 * `server2/apps/stores/tests/test_taxa_por_faixa_de_km.py`.
 */
import {
  precoParaDistancia,
  previaDePrecos,
  problemasDaFormula,
  type FormulaDeEntrega,
} from '../precoDaEntrega';

/** A escada real da Cê Saladas, expressa como fórmula. */
const CE_SALADAS: FormulaDeEntrega = {
  taxaBase: 7,
  raioPlanoKm: 2,
  porKm: 1,
  encareceEmKm: 12,
  porKmLonge: 2,
  raioMaximoKm: 17,
};

const valor = (f: FormulaDeEntrega, km: number) => {
  const r = precoParaDistancia(f, km);
  return r.tipo === 'cobrado' ? r.valor : null;
};

describe('precoParaDistancia — mesmos casos do backend', () => {
  it('dentro do raio plano cobra a base', () => {
    expect(valor(CE_SALADAS, 0.5)).toBe(7);
    expect(valor(CE_SALADAS, 2)).toBe(7);
  });

  it('entre o plano e o ponto caro soma o primeiro por km', () => {
    expect(valor(CE_SALADAS, 5)).toBe(10);
    expect(valor(CE_SALADAS, 12)).toBe(17);
  });

  it('depois do ponto caro continua de onde o barato parou', () => {
    // Não recomeça do zero: 7 + 10*1 + 1*2
    expect(valor(CE_SALADAS, 13)).toBe(19);
    expect(valor(CE_SALADAS, 17)).toBe(27);
  });

  it('não há salto no ponto de virada', () => {
    const antes = valor(CE_SALADAS, 11.99)!;
    const depois = valor(CE_SALADAS, 12.01)!;
    expect(Math.abs(depois - antes)).toBeLessThan(0.1);
  });

  it('acima do raio máximo é fora de área, não taxa alta', () => {
    expect(precoParaDistancia(CE_SALADAS, 20)).toEqual({ tipo: 'fora_de_area' });
  });

  it('sem segundo degrau o cálculo é linear até o fim', () => {
    const semDegrau: FormulaDeEntrega = {
      taxaBase: 9, raioPlanoKm: 4, porKm: 1, raioMaximoKm: 20,
    };
    expect(valor(semDegrau, 4)).toBe(9);
    expect(valor(semDegrau, 10)).toBe(15);
  });

  it('o teto limita o trecho caro e mantém a loja atendendo', () => {
    const comTeto = { ...CE_SALADAS, taxaMaxima: 20 };
    expect(valor(comTeto, 17)).toBe(20);
    // Com teto, longe demais deixa de ser fora de área.
    expect(valor(comTeto, 25)).toBe(20);
  });
});

describe('previaDePrecos', () => {
  it('devolve uma linha por distância pedida', () => {
    const linhas = previaDePrecos(CE_SALADAS);
    expect(linhas.map((l) => l.km)).toEqual([2, 5, 10, 15]);
    expect(linhas.map((l) => (l.resultado.tipo === 'cobrado' ? l.resultado.valor : null)))
      .toEqual([7, 10, 15, 23]);
  });

  it('marca fora de área na prévia em vez de mostrar um preço', () => {
    const curto = { ...CE_SALADAS, raioMaximoKm: 8 };
    const linhas = previaDePrecos(curto);
    expect(linhas.find((l) => l.km === 10)?.resultado.tipo).toBe('fora_de_area');
  });
});

describe('problemasDaFormula — avisa antes de salvar um preço incoerente', () => {
  it('fórmula sadia não gera aviso', () => {
    expect(problemasDaFormula(CE_SALADAS)).toEqual([]);
  });

  it('raio plano maior que o máximo', () => {
    const p = problemasDaFormula({ ...CE_SALADAS, raioPlanoKm: 30 });
    expect(p.join(' ')).toMatch(/raio plano é maior/i);
  });

  it('ponto caro antes do raio plano', () => {
    const p = problemasDaFormula({ ...CE_SALADAS, encareceEmKm: 1 });
    expect(p.join(' ')).toMatch(/encarece precisa ser maior/i);
  });

  it('ponto caro depois do raio máximo nunca é cobrado', () => {
    const p = problemasDaFormula({ ...CE_SALADAS, encareceEmKm: 30 });
    expect(p.join(' ')).toMatch(/nunca é cobrado/i);
  });

  it('km distante mais barato que o km perto é suspeito', () => {
    const p = problemasDaFormula({ ...CE_SALADAS, porKmLonge: 0.5 });
    expect(p.join(' ')).toMatch(/mais barato/i);
  });

  it('valores negativos', () => {
    expect(problemasDaFormula({ ...CE_SALADAS, taxaBase: -1 }).join(' ')).toMatch(/negativa/i);
    expect(problemasDaFormula({ ...CE_SALADAS, raioMaximoKm: 0 }).join(' ')).toMatch(/maior que zero/i);
  });
});
