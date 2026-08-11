import { buildNutritionDoc, buildNutritionQrDoc } from '../labelPrint';

describe('buildNutritionDoc', () => {
  it('gera Zebra 100x80 com colunas ANVISA e escapa o produto', () => {
    const html = buildNutritionDoc([{ name: '<Prato>', servingG: 350, per100g: { energy_kcal: 100 } }]);
    expect(html).toContain('@page { size: 100mm 80mm');
    expect(html).toContain('INFORMAÇÃO NUTRICIONAL');
    expect(html).toContain('100 g');
    expect(html).toContain('350 g');
    expect(html).toContain('%VD*');
    expect(html).toContain('&lt;Prato&gt;');
  });

  it('gera etiqueta compacta 30x22 com QR local', () => {
    const html = buildNutritionQrDoc([{ name: 'Prato', servingG: 330, per100g: {}, publicUrl: 'https://example.com/nutrition/p1' }]);
    expect(html).toContain('@page { size:30mm 22mm');
    expect(html).toContain('<svg');
    expect(html).toContain('Escaneie');
  });
});
