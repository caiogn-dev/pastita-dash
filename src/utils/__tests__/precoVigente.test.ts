import { precoVigenteDoProduto } from '../precoVigente';

describe('preço vigente do produto', () => {
  it('usa o preço promocional quando o backend manda', () => {
    expect(precoVigenteDoProduto({ price: 39.99, preco_vigente: 32.99 })).toBe(32.99);
  });

  it('aceita string, que é como o DRF serializa decimal', () => {
    expect(precoVigenteDoProduto({ price: '39.99', preco_vigente: '32.99' })).toBe(32.99);
  });

  it('sem promoção, cai no preço de cadastro', () => {
    expect(precoVigenteDoProduto({ price: 39.99 })).toBe(39.99);
    expect(precoVigenteDoProduto({ price: 39.99, preco_vigente: null })).toBe(39.99);
    expect(precoVigenteDoProduto({ price: 39.99, preco_vigente: '' })).toBe(39.99);
  });

  it('promoção de valor zero é respeitada — brinde é preço, não ausência', () => {
    expect(precoVigenteDoProduto({ price: 39.99, preco_vigente: 0 })).toBe(0);
  });

  it('produto ausente não quebra a soma do caixa', () => {
    expect(precoVigenteDoProduto(null)).toBe(0);
    expect(precoVigenteDoProduto(undefined)).toBe(0);
  });
});
