/**
 * Frete grátis promocional: leitura, escrita e o que a tela precisa dizer.
 *
 * O backend lê `metadata.frete_gratis`. Duas armadilhas moram aqui:
 *
 * 1. Gravar metadata PARCIAL apaga o resto do objeto (Pixel, Clarity, fiscal).
 * 2. Promoção com raio 0 ou desligada não pode virar "frete grátis" na vitrine.
 */
import {
  custoPorPedidoNoRaio,
  gravarPromo,
  lerPromo,
  problemasDaPromo,
  textoDaPromo,
} from '../freteGratis';
import type { FormulaDeEntrega } from '../precoDaEntrega';

const FORMULA: FormulaDeEntrega = {
  taxaBase: 8,
  raioPlanoKm: 3,
  porKm: 1,
  encareceEmKm: 12,
  porKmLonge: 2,
  raioMaximoKm: 17,
  taxaMaxima: null,
};

describe('lerPromo', () => {
  it('loja sem promoção nasce desligada e sem raio', () => {
    expect(lerPromo({})).toEqual({ ativo: false, ateKm: null, pedidoMinimo: null });
  });

  it('lê o que o backend gravou', () => {
    expect(lerPromo({ frete_gratis: { ativo: true, ate_km: 4, pedido_minimo: 55 } }))
      .toEqual({ ativo: true, ateKm: 4, pedidoMinimo: 55 });
  });

  it('valor em string do JSON vira número', () => {
    expect(lerPromo({ frete_gratis: { ativo: true, ate_km: '4', pedido_minimo: '55' } }).ateKm).toBe(4);
  });

  it('mínimo ausente é nulo, não zero', () => {
    // zero significaria "sem mínimo"; ausente é "o dono ainda não decidiu"
    expect(lerPromo({ frete_gratis: { ativo: true, ate_km: 4 } }).pedidoMinimo).toBeNull();
  });
});

describe('gravarPromo', () => {
  it('preserva o resto do metadata', () => {
    const antes = { delivery_base_fee: 8, meta_pixel_id: '123' };
    const depois = gravarPromo(antes, { ativo: true, ateKm: 4, pedidoMinimo: 55 });

    expect(depois.meta_pixel_id).toBe('123');
    expect(depois.delivery_base_fee).toBe(8);
  });

  it('grava nas chaves que o backend lê', () => {
    const depois = gravarPromo({}, { ativo: true, ateKm: 4, pedidoMinimo: 55 });

    expect(depois.frete_gratis).toEqual({ ativo: true, ate_km: 4, pedido_minimo: 55 });
  });

  it('mínimo vazio vira 0 — o backend trata 0 como sem mínimo', () => {
    const depois = gravarPromo({}, { ativo: true, ateKm: 4, pedidoMinimo: null });

    expect((depois.frete_gratis as Record<string, unknown>).pedido_minimo).toBe(0);
  });

  it('desligar mantém os números para religar depois', () => {
    const depois = gravarPromo({}, { ativo: false, ateKm: 4, pedidoMinimo: 55 });

    expect(depois.frete_gratis).toEqual({ ativo: false, ate_km: 4, pedido_minimo: 55 });
  });
});

describe('problemasDaPromo', () => {
  it('promoção desligada não reclama de nada', () => {
    expect(problemasDaPromo({ ativo: false, ateKm: null, pedidoMinimo: null }, FORMULA)).toEqual([]);
  });

  it('ligada sem raio é erro', () => {
    expect(problemasDaPromo({ ativo: true, ateKm: null, pedidoMinimo: 55 }, FORMULA))
      .toContain('Defina até quantos km o frete sai de graça.');
  });

  it('raio maior que a área de entrega é erro', () => {
    const problemas = problemasDaPromo({ ativo: true, ateKm: 20, pedidoMinimo: 55 }, FORMULA);
    expect(problemas.join(' ')).toContain('17');
  });

  it('configuração sadia não gera aviso', () => {
    expect(problemasDaPromo({ ativo: true, ateKm: 4, pedidoMinimo: 55 }, FORMULA)).toEqual([]);
  });
});

describe('custoPorPedidoNoRaio', () => {
  it('mostra o frete que a loja deixa de cobrar na borda do raio', () => {
    // 8 de base até 3 km, +1/km depois → 4 km custa 9
    expect(custoPorPedidoNoRaio(FORMULA, 4)).toBe(9);
  });

  it('dentro do raio plano é a taxa base', () => {
    expect(custoPorPedidoNoRaio(FORMULA, 2)).toBe(8);
  });

  it('sem raio não há custo a mostrar', () => {
    expect(custoPorPedidoNoRaio(FORMULA, null)).toBeNull();
  });
});

describe('textoDaPromo', () => {
  it('descreve raio e mínimo como o cliente vai ler', () => {
    expect(textoDaPromo({ ativo: true, ateKm: 4, pedidoMinimo: 55 }))
      .toBe('Frete grátis até 4 km em pedidos acima de R$ 55,00');
  });

  it('sem mínimo, a frase encurta', () => {
    expect(textoDaPromo({ ativo: true, ateKm: 4, pedidoMinimo: null }))
      .toBe('Frete grátis até 4 km');
  });

  it('desligada não tem frase', () => {
    expect(textoDaPromo({ ativo: false, ateKm: 4, pedidoMinimo: 55 })).toBe('');
  });
});
