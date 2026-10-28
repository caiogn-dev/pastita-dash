/**
 * Combo no novo pedido (28/10). O criador só carregava produtos — combo é
 * outro cadastro (`/combos/`) e não aparecia. Aqui o combo vira cartão do
 * catálogo (categoria "Combos") e as escolhas viram `selections`, o mesmo
 * formato que o cardápio manda e que o servidor valida.
 */
import type { Product } from '../../../services/products';
import type { ComboProductGroup, StoreCombo } from '../../../services/storesApi';

export type Escolhas = Record<string, string[]>;
export type OpcaoDoGrupo = { id: string; nome: string; preco: number; max: number };

export const CATEGORIA_DOS_COMBOS = 'Combos';

type ProdutoDeCombo = Product & { __combo?: StoreCombo };

export function comboComoProduto(combo: StoreCombo): Product {
  return {
    id: `combo:${combo.id}`,
    name: combo.name,
    price: Number(combo.price) || 0,
    category_name: CATEGORIA_DOS_COMBOS,
    track_stock: combo.track_stock,
    stock_quantity: combo.stock_quantity,
    __combo: combo,
  } as unknown as Product;
}

export function ehCombo(p: Product): boolean {
  return Boolean((p as ProdutoDeCombo).__combo);
}

export function comboDoProduto(p: Product): StoreCombo | undefined {
  return (p as ProdutoDeCombo).__combo;
}

export function tituloDoGrupo(g: ComboProductGroup): string {
  return g.title || g.product_name || 'Escolha';
}

export function opcoesDoGrupo(g: ComboProductGroup): OpcaoDoGrupo[] {
  return [
    ...(g.product_options ?? []).map((o) => ({
      id: o.product_id, nome: o.name, preco: Number(o.price_override ?? o.price) || 0, max: o.max_selections || g.max_selections,
    })),
    ...(g.variant_limits ?? []).map((v) => ({
      id: v.variant_id, nome: v.variant_name, preco: Number(v.price_override ?? 0) || 0, max: v.max_selections || g.max_selections,
    })),
  ];
}

export function escolhasProntas(combo: StoreCombo, escolhas: Escolhas): boolean {
  return combo.groups.every((g) => {
    const n = (escolhas[g.id] ?? []).length;
    const minimo = g.is_required ? Math.max(1, g.min_selections) : g.min_selections;
    return n >= minimo && n <= g.max_selections;
  });
}

/** Estimativa da tela; quem cobra é o servidor (`compute_unit_price`). */
export function precoDoCombo(combo: StoreCombo, escolhas: Escolhas): number {
  const base = Number(combo.price) || 0;
  if (!combo.dynamic_pricing) return base;
  let total = base;
  for (const g of combo.groups) {
    const preco = new Map(opcoesDoGrupo(g).map((o) => [o.id, o.preco]));
    for (const id of escolhas[g.id] ?? []) total += preco.get(id) ?? 0;
  }
  return Math.round(total * 100) / 100;
}

export function resumoDasEscolhas(combo: StoreCombo, escolhas: Escolhas): string {
  const partes: string[] = [];
  for (const g of combo.groups) {
    const nome = new Map(opcoesDoGrupo(g).map((o) => [o.id, o.nome]));
    const contagem = new Map<string, number>();
    for (const id of escolhas[g.id] ?? []) contagem.set(id, (contagem.get(id) ?? 0) + 1);
    contagem.forEach((n, id) => partes.push(`${n > 1 ? `${n}× ` : ''}${nome.get(id) ?? '?'}`));
  }
  return partes.join(' · ');
}

/** Linha do pedido: o mesmo combo com as mesmas escolhas soma; escolhas diferentes, outra linha. */
export function chaveDoCombo(comboId: string, escolhas: Escolhas): string {
  const ordenado = Object.keys(escolhas).sort().map((g) => `${g}=${[...escolhas[g]].sort().join(',')}`);
  return `combo:${comboId}:${ordenado.join('|')}`;
}
