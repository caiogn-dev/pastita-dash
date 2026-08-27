/**
 * As variáveis da oferta que a campanha manda ao cliente (produto_1..preco_2).
 *
 * O preço vai POR ESCRITO na mensagem. Tem que ser o preço VIGENTE do dia
 * (`preco_vigente`), não o de CADASTRO (`price`): prometer no WhatsApp um valor
 * que o balcão não honra é o erro que o cliente percebe na frente do caixa. O
 * resto da tela (seleção, revisão, save do offer_products) já lê o preço do dia
 * com `precoVigenteDoProduto`; só o texto enviado lia o valor cheio.
 *
 * O formato (`32,90`, sem "R$") é o que o painel já mandava — o símbolo mora no
 * corpo do template aprovado na Meta. Esta fatia troca só a FONTE do preço.
 */
import type { StoreProduct } from '../../../../services/storesApi';
import { buildOfferVariables, precoDaOferta } from '../ofertaDaCampanha';

// O helper só olha name/price/preco_vigente; o resto do StoreProduct não importa.
const prod = (over: Partial<StoreProduct>): StoreProduct =>
  ({ id: 1, name: 'Produto', price: 0, status: 'active', ...over } as unknown as StoreProduct);

describe('precoDaOferta', () => {
  it('usa o preço vigente do dia, não o de cadastro', () => {
    // promoção de quinta: cadastro 52,90, preço do dia 32,90
    expect(precoDaOferta(prod({ price: 52.9, preco_vigente: 32.9 }))).toBe('32,90');
  });

  it('sem promoção do dia cai no preço de cadastro', () => {
    expect(precoDaOferta(prod({ price: 39.99, preco_vigente: null }))).toBe('39,99');
  });

  it('preço vigente em string do backend também resolve', () => {
    expect(precoDaOferta(prod({ price: 52.9, preco_vigente: '32.90' }))).toBe('32,90');
  });

  it('sem produto não vira "NaN"', () => {
    expect(precoDaOferta(undefined)).toBe('0,00');
  });
});

describe('buildOfferVariables', () => {
  it('monta os quatro campos com o preço do dia', () => {
    const salmao = prod({ name: 'Salmão Sublime', price: 52.9, preco_vigente: 32.9 });
    const frango = prod({ name: 'Filé de Frango', price: 39.99 });
    expect(buildOfferVariables([salmao, frango])).toEqual({
      produto_1: 'Salmão Sublime',
      preco_1: '32,90',
      produto_2: 'Filé de Frango',
      preco_2: '39,99',
    });
  });

  it('um produto só deixa o segundo nome vazio', () => {
    const v = buildOfferVariables([prod({ name: 'Único', price: 10 })]);
    expect(v.produto_2).toBe('');
    expect(v.preco_2).toBe('0,00');
  });
});
