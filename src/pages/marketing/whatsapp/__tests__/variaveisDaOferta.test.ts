/**
 * As variáveis que a campanha manda para a Meta.
 *
 * O template aprovado `ce_saladas_oferta_do_dia` escreve "• {{produto_1}} —
 * *{{preco_1}}*". Se `preco_1` chega como "52,90", o cliente lê
 * "Salmão Sublime — 52,90" — número solto, sem moeda.
 *
 * O símbolo tem que vir NA VARIÁVEL, não no corpo do template: quem cria o
 * template no WhatsApp Manager não tem como saber o formato que o painel
 * envia, e um "R$" digitado no corpo viraria "R$ R$ 52,90" no dia em que
 * alguém consertar o painel.
 */
import { precoParaTemplate, variaveisDaOferta } from '../variaveisDaOferta';

describe('precoParaTemplate', () => {
  it('inclui o símbolo da moeda', () => {
    expect(precoParaTemplate(52.9)).toBe('R$ 52,90');
  });

  it('usa vírgula decimal e duas casas', () => {
    expect(precoParaTemplate(39.99)).toBe('R$ 39,99');
  });

  it('milhar leva ponto', () => {
    expect(precoParaTemplate(1234.5)).toBe('R$ 1.234,50');
  });

  it('preço em string do backend também funciona', () => {
    expect(precoParaTemplate('52.90')).toBe('R$ 52,90');
  });

  it('sem preço não vira "R$ NaN"', () => {
    expect(precoParaTemplate(null)).toBe('R$ 0,00');
  });

  it('não usa espaço não-quebrável', () => {
    // o NBSP do toLocaleString sobrevive ao envio e aparece torto no WhatsApp
    expect(precoParaTemplate(52.9)).not.toMatch(/ /);
  });
});

describe('variaveisDaOferta', () => {
  const salmao = { name: 'Salmão Sublime', price: 52.9 };
  const frango = { name: 'Especial Filé de Frango', price: 39.99 };

  it('monta os quatro campos da oferta', () => {
    expect(variaveisDaOferta([salmao, frango])).toEqual({
      produto_1: 'Salmão Sublime',
      preco_1: 'R$ 52,90',
      produto_2: 'Especial Filé de Frango',
      preco_2: 'R$ 39,99',
    });
  });

  it('um produto só deixa o segundo par vazio', () => {
    const v = variaveisDaOferta([salmao]);
    expect(v.produto_2).toBe('');
    expect(v.preco_2).toBe('');
  });

  it('sem produtos nenhum campo vira "R$ 0,00"', () => {
    // mandar "R$ 0,00" faria o cliente ler uma oferta de zero real
    expect(variaveisDaOferta([])).toEqual({
      produto_1: '', preco_1: '', produto_2: '', preco_2: '',
    });
  });

  it('usa o preço vigente, não o de cadastro', () => {
    // O `offer_products.price` enviado ao backend já vai com o `preco_vigente`
    // (a promoção do dia). Se a VARIÁVEL do template mandasse o `price` cru, o
    // cliente leria no corpo da mensagem um preço mais caro do que o que o
    // painel diz cobrar — o mesmo defeito de "mostrar/cobrar com price" que
    // este projeto já corrigiu no storefront e no PDV.
    const emPromo = { name: 'Salmão Sublime', price: 52.9, preco_vigente: 42.9 };
    expect(variaveisDaOferta([emPromo])).toMatchObject({
      produto_1: 'Salmão Sublime',
      preco_1: 'R$ 42,90',
    });
  });

  it('sem promoção do dia, cai no preço de cadastro', () => {
    const semPromo = { name: 'Especial Filé de Frango', price: 39.99, preco_vigente: null };
    expect(variaveisDaOferta([semPromo])).toMatchObject({
      preco_1: 'R$ 39,99',
    });
  });
});
