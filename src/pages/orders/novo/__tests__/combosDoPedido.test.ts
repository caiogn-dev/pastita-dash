// Combo no novo pedido (28/10): o criador só carregava produtos e combo não
// tinha como entrar num pedido de balcão.
import { comboComoProduto, ehCombo, opcoesDoGrupo, escolhasProntas, precoDoCombo, resumoDasEscolhas, chaveDoCombo } from '../combosDoPedido';
import type { StoreCombo } from '../../../../services/storesApi';

const combo = {
  id: 'c1', name: 'Combo Família', price: 50, dynamic_pricing: false, is_active: true,
  track_stock: false, stock_quantity: 0,
  groups: [
    { id: 'g1', product_id: null, product_name: '', title: 'Prato', is_required: true, min_selections: 2, max_selections: 2,
      allow_duplicate_variants: true, position: 0, variant_limits: [],
      product_options: [
        { product_id: 'p1', name: 'Frango', price: 20, max_selections: 2 },
        { product_id: 'p2', name: 'Carne', price: 25, price_override: 22, max_selections: 2 },
      ] },
    { id: 'g2', product_id: 'x', product_name: 'Suco', title: '', is_required: false, min_selections: 0, max_selections: 1,
      allow_duplicate_variants: false, position: 1,
      variant_limits: [{ id: 'l1', variant_id: 'v1', variant_name: 'Laranja', variant_sku: '', stock: 5, max_selections: 1 }] },
  ],
} as unknown as StoreCombo;

it('vira cartão do catálogo na categoria Combos', () => {
  const p = comboComoProduto(combo);
  expect(p.name).toBe('Combo Família');
  expect(p.category_name).toBe('Combos');
  expect(ehCombo(p)).toBe(true);
});

it('opções juntam produtos e sabores, com nome do grupo', () => {
  expect(opcoesDoGrupo(combo.groups[0]).map((o) => o.nome)).toEqual(['Frango', 'Carne']);
  expect(opcoesDoGrupo(combo.groups[1]).map((o) => o.id)).toEqual(['v1']);
});

it('só fica pronto quando os grupos obrigatórios têm o mínimo', () => {
  expect(escolhasProntas(combo, { g1: ['p1'] })).toBe(false);
  expect(escolhasProntas(combo, { g1: ['p1', 'p2'] })).toBe(true);
});

it('preço fixo ignora escolhas; dinâmico soma o preço de cada uma', () => {
  expect(precoDoCombo(combo, { g1: ['p1', 'p2'] })).toBe(50);
  const dinamico = { ...combo, dynamic_pricing: true, price: 5 } as StoreCombo;
  expect(precoDoCombo(dinamico, { g1: ['p1', 'p2'] })).toBe(5 + 20 + 22);
});

it('resumo conta repetições', () => {
  expect(resumoDasEscolhas(combo, { g1: ['p1', 'p1'], g2: ['v1'] })).toBe('2× Frango · Laranja');
});

it('mesmo combo com escolhas diferentes são linhas diferentes', () => {
  expect(chaveDoCombo('c1', { g1: ['p1', 'p2'] })).toBe(chaveDoCombo('c1', { g1: ['p2', 'p1'] }));
  expect(chaveDoCombo('c1', { g1: ['p1', 'p1'] })).not.toBe(chaveDoCombo('c1', { g1: ['p1', 'p2'] }));
});
