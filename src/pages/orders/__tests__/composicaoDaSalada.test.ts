/**
 * A composição de uma salada montada, legível.
 *
 * A tela mostrava o campo `notes`, que o storefront grava já achatado:
 *
 *   "Base: Alface | Proteína: Frango em pedaços | Complementos: Mandioca,
 *    Mandioca, Mandioca, Mandioca, Cenoura ralada, Chips de moranga |
 *    molhos: Mostarda e mel"
 *
 * Uma linha corrida, com o mesmo ingrediente repetido quatro vezes em vez de
 * "4× Mandioca" — e quem monta a salada precisa ler isso com o pote na mão.
 * O pedido já traz `options.ingredients` estruturado; é de lá que se monta.
 */
import { composicaoDaSalada } from '../composicaoDaSalada';

const ALFACE = { id: 'i1', name: 'Alface', role: 'base', price: 1.99 };
const FRANGO = { id: 'i2', name: 'Frango em pedaços', role: 'proteina', price: 14.99 };
const MANDIOCA = { id: 'i3', name: 'Mandioca', role: 'complemento', price: 2.99 };
const CENOURA = { id: 'i4', name: 'Cenoura ralada', role: 'complemento', price: 1.5 };
const MOLHO = { id: 'i5', name: 'Mostarda e mel', role: 'molho', price: 0 };

it('agrupa por papel, na ordem em que a salada é montada', () => {
  const grupos = composicaoDaSalada({
    is_salad_builder: true,
    ingredients: [MOLHO, MANDIOCA, FRANGO, ALFACE],
  });
  expect(grupos.map((g) => g.papel)).toEqual(['Base', 'Proteína', 'Complementos', 'Molhos']);
});

it('junta o ingrediente repetido em vez de listar quatro vezes', () => {
  const grupos = composicaoDaSalada({
    is_salad_builder: true,
    ingredients: [MANDIOCA, MANDIOCA, MANDIOCA, MANDIOCA, CENOURA],
  });
  expect(grupos[0].itens).toEqual(['4× Mandioca', 'Cenoura ralada']);
});

it('ingrediente único não ganha contador', () => {
  const grupos = composicaoDaSalada({ is_salad_builder: true, ingredients: [ALFACE] });
  expect(grupos[0].itens).toEqual(['Alface']);
});

it('papel desconhecido não some — entra com o próprio nome', () => {
  const grupos = composicaoDaSalada({
    is_salad_builder: true,
    ingredients: [{ id: 'x', name: 'Castanha', role: 'crocante', price: 3 }],
  });
  expect(grupos[0].papel).toBe('Crocante');
  expect(grupos[0].itens).toEqual(['Castanha']);
});

it('sem ingredientes estruturados, não inventa composição', () => {
  expect(composicaoDaSalada({ is_salad_builder: true })).toEqual([]);
  expect(composicaoDaSalada(undefined)).toEqual([]);
  expect(composicaoDaSalada({})).toEqual([]);
});

it('ingrediente sem nome é descartado em vez de virar linha vazia', () => {
  const grupos = composicaoDaSalada({
    is_salad_builder: true,
    ingredients: [ALFACE, { id: 'z', name: '', role: 'base', price: 0 }],
  });
  expect(grupos[0].itens).toEqual(['Alface']);
});
