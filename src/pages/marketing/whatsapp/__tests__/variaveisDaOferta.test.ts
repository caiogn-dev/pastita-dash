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
});

describe('preço da campanha x preço que a loja cobra', () => {
  /**
   * A campanha anuncia o preço que o cliente VAI PAGAR, e não o de tabela.
   *
   * Em 04/09 o dono montou uma campanha e viu "Tilápia Suprema — R$ 46,99"
   * num dia em que a loja cobrava o promocional. Anunciar caro afasta quem
   * abriria a mensagem; anunciar barato e cobrar caro é pior ainda — é a
   * mesma promessa-na-tela + cobrança-diferente que já custou dinheiro aqui
   * no cupom BEMVINDO10.
   *
   * `preco_vigente` é o campo em que o backend já resolve a promoção do dia
   * (`promo_price` + `promo_weekday`); `price` é só o valor de cadastro.
   */
  it('usa o preço VIGENTE quando o produto está em promoção', () => {
    expect(
      variaveisDaOferta([{ name: 'Queridinha', price: 36.99, preco_vigente: 28.99 }]),
    ).toMatchObject({ produto_1: 'Queridinha', preco_1: 'R$ 28,99' });
  });

  it('cai no preço de tabela quando não há promoção hoje', () => {
    expect(
      variaveisDaOferta([{ name: 'Basic Lombo', price: 40.99, preco_vigente: 40.99 }]),
    ).toMatchObject({ preco_1: 'R$ 40,99' });
  });

  it('produto sem `preco_vigente` continua funcionando', () => {
    // Compatibilidade: nem toda listagem do painel traz o campo.
    expect(
      variaveisDaOferta([{ name: 'Tilápia Suprema', price: 46.99 }]),
    ).toMatchObject({ preco_1: 'R$ 46,99' });
  });
});
