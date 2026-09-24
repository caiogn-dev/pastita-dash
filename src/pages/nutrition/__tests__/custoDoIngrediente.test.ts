import { custoPorMil } from '../custoDoIngrediente';

// "Paguei R$ X por Y" vira o custo de 1 kg (ou 1 litro) na unidade da
// receita. Por mil e não por grama: R$ 0,002/g de sal apareceria como R$ 0,00.
describe('custoPorMil', () => {
  const base = { unidadeBase: 'g', densidade: '' };

  test('comprado na mesma unidade da receita', () => {
    expect(custoPorMil({ ...base, preco: '30', quantidade: '1000', unidade: 'g', porUnidade: '' })).toBeCloseTo(30);
  });

  test('comprado por unidade usa o conteúdo de cada uma', () => {
    // 30 ovos de 50 g por R$ 24 → 1,5 kg → R$ 16/kg.
    expect(custoPorMil({ ...base, preco: '24', quantidade: '30', unidade: 'un', porUnidade: '50' })).toBeCloseTo(16);
  });

  test('ml contra receita em g só com densidade', () => {
    expect(custoPorMil({ ...base, preco: '46', quantidade: '500', unidade: 'ml', porUnidade: '' })).toBeNull();
    expect(custoPorMil({ unidadeBase: 'g', densidade: '0.92', preco: '46', quantidade: '500', unidade: 'ml', porUnidade: '' })).toBeCloseTo(100);
  });

  test('aceita vírgula brasileira', () => {
    expect(custoPorMil({ ...base, preco: '12,50', quantidade: '500', unidade: 'g', porUnidade: '' })).toBeCloseTo(25);
  });

  test('sem preço ou sem quantidade não inventa zero', () => {
    expect(custoPorMil({ ...base, preco: '', quantidade: '1000', unidade: 'g', porUnidade: '' })).toBeNull();
    expect(custoPorMil({ ...base, preco: '10', quantidade: '0', unidade: 'g', porUnidade: '' })).toBeNull();
    expect(custoPorMil({ ...base, preco: '24', quantidade: '30', unidade: 'un', porUnidade: '' })).toBeNull();
  });
});
