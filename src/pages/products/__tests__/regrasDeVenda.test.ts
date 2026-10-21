import { problemaDasRegras, regrasParaGravar, resumoDasRegras } from '../regrasDeVenda';

describe('regras de venda do produto', () => {
  it('grava só o que tem efeito', () => {
    expect(regrasParaGravar({ dias: [0, 1, 2, 3, 4, 5, 6], de: '', ate: '', so_retirada: false, minimo: 1 })).toEqual({});
    expect(regrasParaGravar({ dias: [4, 0, 4], de: '11:00', ate: '15:00', minimo: 10 }))
      .toEqual({ dias: [0, 4], de: '11:00', ate: '15:00', minimo: 10 });
  });

  it.each([
    [{ de: '11:00' }, /início e o fim/],
    [{ de: '15:00', ate: '11:00' }, /meia-noite/],
    [{ dias: [] }, /ao menos um dia/],
    [{ minimo: 10, maximo: 5 }, /mínima não pode passar/],
    [{ maximo: 0.5 }, /1 a 999/],
  ])('recusa %j', (regras, msg) => {
    expect(problemaDasRegras(regras)).toMatch(msg);
  });

  it('regra boa não tem problema', () => {
    expect(problemaDasRegras({ dias: [5], de: '11:00', ate: '15:00', so_retirada: true, minimo: 2, maximo: 3 })).toBeNull();
  });

  it('resume para o selo da lista', () => {
    expect(resumoDasRegras({ dias: [0, 1, 2, 3, 4], de: '11:00', ate: '15:00' })).toBe('Seg a Sex · 11:00–15:00');
    expect(resumoDasRegras({ dias: [5, 6], so_retirada: true, minimo: 10 })).toBe('Sáb, Dom · só retirada · mín. 10');
    expect(resumoDasRegras({})).toBe('');
  });
});
