/**
 * Tabela pronta da loja (laudo/nutricionista), impressa como foi declarada.
 *
 * A Agrião mandou 32 PDFs (09/10) e pediu o mesmo layout. Recalcular a porção
 * a partir do valor por 100 g diverge do declarado: 209 kcal × 3,3 = 689,7,
 * e o PDF diz 691. O que sai impresso é o que o responsável assinou.
 */
import { buildNutritionA4Doc, buildNutritionDoc } from '../labelPrint';

const declarada = {
  porcoesPorEmbalagem: '1',
  porcao: '330 g (1 marmita)',
  colunaPorcao: '330 g',
  linhas: {
    energy_kcal: ['209', '691', '35'],
    total_sugars_g: ['1,7', '5,6', ''],
    protein_g: ['16', '53', '106'],
    sodium_mg: ['368', '1216', '61'],
  },
  declaracoes: ['ZERO LACTOSE', 'CONTÉM GLÚTEN'],
};

const prato = {
  name: 'Parmegiana de Frango',
  servingG: 330,
  per100g: { energy_kcal: 209 },
  ingredients: 'Filé de peito de frango, farinha de trigo.',
  storeName: 'Agrião - Comida Saudável',
  logoUrl: 'https://cdn.exemplo/logo.png',
  declarada,
};

describe('página A4 da tabela nutricional', () => {
  it('imprime a porção e o %VD declarados, não recalculados', () => {
    const html = buildNutritionA4Doc([prato] as never);
    expect(html).toContain('691');
    expect(html).not.toContain('689,7');
    expect(html).toContain('1216');
    expect(html).toContain('106');
    expect(html).toContain('330 g (1 marmita)');
    expect(html).toContain('Porções por embalagem: 1');
  });

  it('traz título, ingredientes, declarações e a marca da loja', () => {
    const html = buildNutritionA4Doc([prato] as never);
    expect(html).toContain('Parmegiana de Frango');
    expect(html).toContain('INGREDIENTES:');
    expect(html).toContain('farinha de trigo');
    expect(html).toContain('ZERO LACTOSE');
    expect(html).toContain('CONTÉM GLÚTEN');
    expect(html).toContain('logo.png');
    expect(html).toContain('AGRIÃO - COMIDA SAUDÁVEL');
    expect(html).toContain('size: A4');
  });

  it('uma página por prato', () => {
    const html = buildNutritionA4Doc([prato, { ...prato, name: 'Franguinho da Vovó' }] as never);
    expect(html.match(/class="folha"/g)).toHaveLength(2);
  });

  it('a etiqueta 100×80 também usa a tabela declarada quando ela existe', () => {
    const html = buildNutritionDoc([prato] as never);
    expect(html).toContain('691');
    expect(html).not.toContain('689,7');
    expect(html).toContain('CONTÉM GLÚTEN');
    expect(html).toContain('Porções por embalagem: 1');
  });
});
