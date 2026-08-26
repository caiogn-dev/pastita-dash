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
});

describe('variaveisDaOferta manda o preço que o cliente paga hoje', () => {
  it('produto em promoção do dia envia preco_vigente, não o de cadastro', () => {
    // Sem isso a campanha anuncia o cheio (R$ 52,90) num produto que hoje
    // sai a R$ 39,90 — e o cliente lê o número mais caro POR ESCRITO.
    const emPromo = { name: 'Salmão Sublime', price: 52.9, preco_vigente: 39.9 };
    expect(variaveisDaOferta([emPromo]).preco_1).toBe('R$ 39,90');
  });

  it('preco_vigente em string do backend também é respeitado', () => {
    const emPromo = { name: 'Frango', price: 39.99, preco_vigente: '32.99' };
    expect(variaveisDaOferta([emPromo]).preco_1).toBe('R$ 32,99');
  });

  it('sem preço do dia cai no valor de cadastro', () => {
    const semPromo = { name: 'Frango', price: 39.99, preco_vigente: null };
    expect(variaveisDaOferta([semPromo]).preco_1).toBe('R$ 39,99');
  });
});
