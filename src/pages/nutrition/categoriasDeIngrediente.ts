/**
 * Categorias de ingrediente: junta as duplicadas e esconde as estrangeiras.
 * Espelha `apps/nutrition/categorias.py` do server2 (mantenha as duas iguais).
 */
const PALAVRAS_ESTRANGEIRAS = new Set([
  'and', 'the', 'of', 'based', 'plant', 'foods', 'food', 'products', 'beverages',
  'snacks', 'cereals', 'dairies', 'fruits', 'vegetables', 'sauces', 'spreads',
  'groceries', 'productos', 'los', 'las', 'del', 'con',
]);

export const chaveDeCategoria = (c: string): string =>
  (c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const categoriaEstrangeira = (c: string): boolean =>
  chaveDeCategoria(c).split(' ').some((p) => PALAVRAS_ESTRANGEIRAS.has(p));

const ate1Letra = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) return [...a].filter((x, i) => x !== b[i]).length <= 1;
  const [curta, longa] = a.length < b.length ? [a, b] : [b, a];
  return [...longa].some((_, i) => longa.slice(0, i) + longa.slice(i + 1) === curta);
};

/** {categoria crua -> categoria final}; '' = sem categoria/estrangeira (não aparece). */
export function mapaDeCategorias(cruas: string[]): Record<string, string> {
  const contagem = new Map<string, number>();
  cruas.forEach((c) => contagem.set(c, (contagem.get(c) ?? 0) + 1));
  const porChave = new Map<string, Map<string, number>>();
  contagem.forEach((n, crua) => {
    if (!crua.trim() || categoriaEstrangeira(crua)) return;
    const k = chaveDeCategoria(crua);
    const m = porChave.get(k) ?? new Map<string, number>();
    m.set(crua.trim(), (m.get(crua.trim()) ?? 0) + n);
    porChave.set(k, m);
  });
  const total = (m: Map<string, number>) => [...m.values()].reduce((s, n) => s + n, 0);
  const alvo = new Map<string, string>();
  [...porChave.keys()]
    .sort((a, b) => total(porChave.get(b)!) - total(porChave.get(a)!) || a.localeCompare(b))
    .forEach((k) => {
      const destino = [...alvo.values()].find((a) => a !== k && k.length >= 4 && ate1Letra(k, a));
      alvo.set(k, destino ?? k);
    });
  const final = new Map<string, string>();
  porChave.forEach((_, k) => {
    const raiz = alvo.get(k)!;
    const variantes = new Map<string, number>();
    porChave.forEach((m, k2) => {
      if (alvo.get(k2) === raiz) m.forEach((n, v) => variantes.set(v, (variantes.get(v) ?? 0) + n));
    });
    const melhor = [...variantes.entries()].sort(
      (a, b) => b[1] - a[1] || Number(chaveDeCategoria(b[0]) !== b[0]) - Number(chaveDeCategoria(a[0]) !== a[0]) || a[0].localeCompare(b[0]),
    )[0][0];
    final.set(k, melhor.charAt(0).toUpperCase() + melhor.slice(1));
  });
  const saida: Record<string, string> = {};
  contagem.forEach((_, crua) => {
    saida[crua] = !crua.trim() || categoriaEstrangeira(crua) ? '' : final.get(chaveDeCategoria(crua)) ?? '';
  });
  return saida;
}
