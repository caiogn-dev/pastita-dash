import { semAcento, paraBusca, slugify } from '../texto';

describe('semAcento', () => {
  it('tira o acento e mantém a caixa', () => {
    expect(semAcento('Ação Pão É')).toBe('Acao Pao E');
  });
});

describe('paraBusca', () => {
  it('sem acento e minúsculo', () => {
    expect(paraBusca('Feijão TROPEIRO')).toBe('feijao tropeiro');
  });
});

describe('slugify', () => {
  it('vira slug de url', () => {
    expect(slugify('  Salada Caesar (Grande)! ')).toBe('salada-caesar-grande');
  });
  it('corta no máximo sem deixar hífen no fim', () => {
    expect(slugify('abc def ghi', { max: 4 })).toBe('abc');
  });
  it('usa o reserva quando não sobra nada', () => {
    expect(slugify('!!!', { reserva: 'produto' })).toBe('produto');
    expect(slugify('!!!')).toBe('');
  });
});
