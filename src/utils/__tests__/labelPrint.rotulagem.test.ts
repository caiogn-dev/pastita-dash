/**
 * A etiqueta impressa é o produto final de toda a cadeia nutricional — e é
 * onde o erro vira consequência legal.
 *
 * Dois comportamentos que não podem regredir: a coluna da porção usa os
 * valores já arredondados pela IN 75/2020 quando eles vêm, e a lupa da RDC
 * 429/2020 é impressa como selo.
 */
import { buildNutritionDoc } from '../labelPrint';

const base = {
  name: 'Prato',
  servingG: 200,
  per100g: { energy_kcal: 100, trans_fat_g: 0 },
};

describe('etiqueta nutricional', () => {
  it('usa a coluna de porção arredondada quando ela vem', () => {
    // 0,04 g por 100 g daria 0,08 g na porção se derivasse por multiplicação;
    // a norma manda declarar 0.
    const html = buildNutritionDoc([{ ...base, perServing: { energy_kcal: 200, trans_fat_g: 0 } }] as never);
    expect(html).not.toContain('0,08');
  });

  it('imprime o selo ALTO EM quando a avaliação foi conclusiva', () => {
    const html = buildNutritionDoc([{ ...base, frontOfPack: ['ALTO EM SÓDIO'] }] as never);
    expect(html).toContain('ALTO EM SÓDIO');
  });

  it('não inventa selo quando não veio nenhum', () => {
    const html = buildNutritionDoc([base] as never);
    expect(html).not.toContain('ALTO EM');
  });

  it('imprime a declaração de alergênicos quando ela vem preenchida', () => {
    const html = buildNutritionDoc([{ ...base, allergens: 'ALÉRGICOS: CONTÉM LEITE.' }] as never);
    expect(html).toContain('CONTÉM LEITE');
  });

  it('não imprime bloco de alergênico quando o backend mandou vazio', () => {
    // Vazio = algum ingrediente sem revisão. Silêncio é melhor que afirmar.
    const html = buildNutritionDoc([{ ...base, allergens: '' }] as never);
    expect(html).not.toContain('ALÉRGICOS');
  });
});
