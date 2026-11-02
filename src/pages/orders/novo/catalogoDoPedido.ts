import type { Product } from '../../../services/products';

export const SEM_CATEGORIA = 'Outros';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Categorias na ordem do cardápio (a lista já vem ordenada), "Outros" no fim. */
export function categoriasDoCatalogo(produtos: Product[]): { nome: string; quantidade: number }[] {
  const contagem = new Map<string, number>();
  for (const p of produtos) {
    const nome = p.category_name || SEM_CATEGORIA;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  const lista = [...contagem].map(([nome, quantidade]) => ({ nome, quantidade }));
  return [...lista.filter((c) => c.nome !== SEM_CATEGORIA), ...lista.filter((c) => c.nome === SEM_CATEGORIA)];
}

/**
 * Busca procura no cardápio inteiro, mesmo com categoria escolhida: quem
 * digita "brownie" dentro de Saladas quer o brownie, não "nenhum resultado".
 */
export function filtrarCatalogo(produtos: Product[], categoria: string | null, busca: string): Product[] {
  const termo = normalizar(busca.trim());
  if (termo) {
    return produtos.filter((p) => normalizar(p.name).includes(termo) || normalizar(p.sku ?? '').includes(termo));
  }
  if (!categoria) return produtos;
  return produtos.filter((p) => (p.category_name || SEM_CATEGORIA) === categoria);
}

export type Selo = { texto: string; tom: 'ok' | 'alerta' | 'perigo'; esgotado: boolean };

/** "N disponíveis" verde/laranja, "Esgotado" vermelho. Sem controle de estoque: nada. */
export function seloDeEstoque(p: Product): Selo | null {
  if (!p.track_stock) return null;
  const n = Number(p.stock_quantity) || 0;
  if (n <= 0) return { texto: 'Esgotado', tom: 'perigo', esgotado: true };
  return { texto: `${n} disponíveis`, tom: n <= 10 ? 'alerta' : 'ok', esgotado: false };
}
