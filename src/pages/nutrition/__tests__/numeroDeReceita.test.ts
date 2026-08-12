import { paraCampo, paraTexto } from '../numeroDeReceita';

/**
 * O backend guarda gramas em decimal de 3 casas e devolve "600.000". Três
 * dígitos que o operador não digitou, num campo onde ele vai digitar.
 */
describe('número de receita', () => {
  it('tira os zeros que o banco acrescenta', () => {
    expect(paraCampo('600.000')).toBe('600');
    expect(paraCampo('50.000')).toBe('50');
  });

  it('mantém a casa decimal de quem realmente precisa dela', () => {
    // Sal, fermento, essência: aí 2,5 g é 2,5 g.
    expect(paraCampo('2.500')).toBe('2.5');
    expect(paraCampo('0.125')).toBe('0.125');
  });

  it('não inventa precisão além do que o campo guarda', () => {
    expect(paraCampo(1.23456)).toBe('1.235');
  });

  it('vazio continua vazio, para o campo não mostrar zero', () => {
    expect(paraCampo(null)).toBe('');
    expect(paraCampo(undefined)).toBe('');
    expect(paraCampo('')).toBe('');
  });

  it('devolve o original quando não é número', () => {
    expect(paraCampo('abc')).toBe('abc');
  });

  it('exibição usa vírgula, que é como se lê em português', () => {
    expect(paraTexto('2.500')).toBe('2,5');
    expect(paraTexto('600.000')).toBe('600');
  });
});
