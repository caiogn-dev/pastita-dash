/**
 * A composição de uma salada montada, agrupada por papel.
 *
 * O modal exibia o campo `notes`, que o storefront grava já achatado numa
 * linha só — com o mesmo ingrediente repetido tantas vezes quantas foi
 * escolhido:
 *
 *   "Base: Alface | Proteína: Frango | Complementos: Mandioca, Mandioca,
 *    Mandioca, Mandioca, Cenoura ralada | molhos: Mostarda e mel"
 *
 * Quem monta a salada lê isso com o pote na mão. O pedido já traz
 * `options.ingredients` estruturado (`{name, role}`), então a tela para de
 * ler o texto pronto e monta o que precisa: um grupo por papel, e a
 * quantidade como número.
 */

export interface GrupoDaSalada {
  /** "Base", "Proteína", "Complementos"… já em português, pronto para exibir. */
  papel: string;
  /** Ex.: `['4× Mandioca', 'Cenoura ralada']`. */
  itens: string[];
}

interface IngredienteBruto {
  name?: string;
  role?: string;
}

/** A ordem em que a salada é montada — é como quem prepara vai ler. */
const ORDEM_DOS_PAPEIS = ['base', 'proteina', 'complemento', 'adicional', 'molho'];

const NOME_DO_PAPEL: Record<string, string> = {
  base: 'Base',
  proteina: 'Proteína',
  complemento: 'Complementos',
  adicional: 'Adicionais',
  molho: 'Molhos',
};

const capitalizar = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function composicaoDaSalada(
  options: { is_salad_builder?: boolean; ingredients?: unknown } | null | undefined,
): GrupoDaSalada[] {
  const brutos = Array.isArray(options?.ingredients)
    ? (options?.ingredients as IngredienteBruto[])
    : [];
  if (!brutos.length) return [];

  // Papel → nome → quantas vezes. `Map` preserva a ordem de chegada, que é a
  // ordem em que a pessoa escolheu — melhor que reordenar por conta própria.
  const porPapel = new Map<string, Map<string, number>>();
  for (const bruto of brutos) {
    const nome = (bruto?.name || '').trim();
    // Ingrediente sem nome viraria uma linha em branco no meio da receita.
    if (!nome) continue;
    const papel = (bruto?.role || '').trim().toLowerCase() || 'outros';
    if (!porPapel.has(papel)) porPapel.set(papel, new Map());
    const contagem = porPapel.get(papel)!;
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  const papeis = [...porPapel.keys()].sort((a, b) => {
    const ia = ORDEM_DOS_PAPEIS.indexOf(a);
    const ib = ORDEM_DOS_PAPEIS.indexOf(b);
    // Papel que a loja inventou depois vai para o fim, sem sumir da tela.
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return papeis.map((papel) => ({
    papel: NOME_DO_PAPEL[papel] ?? capitalizar(papel),
    itens: [...porPapel.get(papel)!.entries()].map(
      ([nome, vezes]) => (vezes > 1 ? `${vezes}× ${nome}` : nome),
    ),
  }));
}
