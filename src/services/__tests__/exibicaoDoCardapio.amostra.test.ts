/**
 * Amostra do cardápio (13/10): os desenhos da Exibição usam um produto DE
 * VERDADE da loja — a foto real em "Cortar" × "Inteira", a descrição real
 * cortada no "ver mais". Desenho genérico não mostra o que vai mudar.
 */
jest.mock('../api', () => ({ __esModule: true, default: {} }));

import { escolherAmostra, resumirDescricao } from '../exibicaoDoCardapio';

describe('escolherAmostra', () => {
  it('prefere produto com foto e descrição, a mais longa', () => {
    const a = escolherAmostra({
      products: [
        { name: 'Sem foto', description: 'x'.repeat(300), price: '10' },
        { name: 'Curta', description: 'Alface', main_image_url: 'https://m/1.webp', price: '20' },
        { name: 'Longa', description: 'Frango grelhado, mix de folhas e molho da casa', main_image_url: 'https://m/2.webp', preco_vigente: '30.5', price: '35' },
      ],
    });
    expect(a).toEqual({
      nome: 'Longa',
      descricao: 'Frango grelhado, mix de folhas e molho da casa',
      foto: 'https://m/2.webp',
      preco: 30.5,
    });
  });

  it('usa combo quando não há produto, e nada quando o catálogo está vazio', () => {
    expect(escolherAmostra({ products: [], combos: [{ name: 'Combo', description: 'd', image_url: 'https://m/c.webp', price: '50' }] })?.nome).toBe('Combo');
    expect(escolherAmostra({})).toBeNull();
    expect(escolherAmostra(null)).toBeNull();
  });
});

describe('resumirDescricao (espelho da vitrine)', () => {
  it('0 = automático, sem corte por caractere', () => {
    expect(resumirDescricao('abc def', 0)).toBeNull();
  });

  it('corta na última palavra inteira e põe reticências', () => {
    expect(resumirDescricao('1x Queridinha 1x Suco da sua escolha', 20)).toEqual({ texto: '1x Queridinha 1x…', cortou: true });
  });

  it('texto curto passa inteiro, sem negrito de markdown', () => {
    expect(resumirDescricao('**Frango** grelhado', 100)).toEqual({ texto: 'Frango grelhado', cortou: false });
  });
});
