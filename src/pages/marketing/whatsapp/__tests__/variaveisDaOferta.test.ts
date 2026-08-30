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
    expect(precoParaTemplate(52.9)).not.toMatch(/\u00A0/);
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

  it('manda o preço VIGENTE, não o de cadastro', () => {
    // A campanha escreve o preço no WhatsApp do cliente. Se o produto está em
    // promoção do dia (`preco_vigente`), é ESSE valor que tem que ir na
    // mensagem — mandar o `price` cheio anuncia um preço que o cliente não vai
    // pagar no balcão. O mesmo valor que segue no payload `offer_products`.
    const emPromocao = { name: 'Salmão Sublime', price: 52.9, preco_vigente: 32.9 };
    expect(variaveisDaOferta([emPromocao]).preco_1).toBe('R$ 32,90');
  });

  it('preço vigente em string do backend também vale', () => {
    const emPromocao = { name: 'Frango', price: '39.99', preco_vigente: '29.90' };
    expect(variaveisDaOferta([emPromocao]).preco_1).toBe('R$ 29,90');
  });

  it('sem promoção do dia cai no preço de cadastro', () => {
    const semPromo = { name: 'Salmão', price: 52.9, preco_vigente: null };
    expect(variaveisDaOferta([semPromo]).preco_1).toBe('R$ 52,90');
  });
});
