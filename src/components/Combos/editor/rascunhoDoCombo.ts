/**
 * Rascunho do combo — o modelo que o editor manipula.
 *
 * O formato da API (min_selections, price_override, variant_limits…) é o do
 * banco e continua igual: os combos já cadastrados (Família, Casal e Semanal
 * da Agrião, por exemplo) seguem válidos. O editor só fala outra língua por
 * cima dele: "Escolha exatamente 3", "Brinde", "−3%".
 */
import type {
  StoreCombo,
  StoreComboPayload,
  StoreProduct,
  ComboProductGroupInput,
} from '../../../services/storesApi';

export type TipoDeGrupo = 'produtos' | 'variantes';
export type ModoDaRegra = 'exatamente' | 'ate' | 'entre';

export interface OpcaoDoGrupo {
  chave: string;
  produtoId?: string;
  varianteId?: string;
  nome: string;
  /** Preço do cadastro (produto ou variação). */
  preco: number;
  /** Preço dentro do combo; vazio = usa o do cadastro. */
  precoProprio?: number;
  /** Quantas vezes esta opção pode entrar no grupo. */
  maximo: number;
  estoque?: number;
  foto?: string;
}

export interface GrupoDoCombo {
  chave: string;
  tipo: TipoDeGrupo;
  titulo: string;
  produtoBaseId?: string;
  minimo: number;
  maximo: number;
  podeRepetir: boolean;
  opcoes: OpcaoDoGrupo[];
}

export interface RascunhoDoCombo {
  nome: string;
  descricao: string;
  preco: number;
  precoDe?: number;
  precoPelaSoma: boolean;
  fotoUrl: string;
  ativo: boolean;
  destaque: boolean;
  controlarEstoque: boolean;
  estoque: number;
  selos?: number;
  inclui: string[];
  /** Chaves do metadata que o editor não conhece: voltam intactas. */
  metadataExtra: Record<string, unknown>;
  grupos: GrupoDoCombo[];
}

let contador = 0;
const novaChave = (prefixo: string) => `${prefixo}_${Date.now().toString(36)}_${(contador++).toString(36)}`;

const numero = (v: unknown, padrao = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : padrao;
};

const opcional = (v: unknown): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : numero(v);

export const rascunhoVazio = (): RascunhoDoCombo => ({
  nome: '',
  descricao: '',
  preco: 0,
  precoDe: undefined,
  precoPelaSoma: false,
  fotoUrl: '',
  ativo: true,
  destaque: false,
  controlarEstoque: false,
  estoque: 0,
  selos: undefined,
  inclui: [],
  metadataExtra: {},
  grupos: [],
});

export const novoGrupo = (tipo: TipoDeGrupo): GrupoDoCombo => ({
  chave: novaChave('g'),
  tipo,
  titulo: '',
  produtoBaseId: undefined,
  minimo: 1,
  maximo: 1,
  podeRepetir: false,
  opcoes: [],
});

// ── Regra em frase ─────────────────────────────────────────────────────────

export const regraDoGrupo = (g: Pick<GrupoDoCombo, 'minimo' | 'maximo'>) => {
  if (g.minimo === g.maximo) return { modo: 'exatamente' as const, a: g.maximo, b: g.maximo };
  if (g.minimo === 0) return { modo: 'ate' as const, a: 0, b: g.maximo };
  return { modo: 'entre' as const, a: g.minimo, b: g.maximo };
};

/** `quantidade` é o número principal da frase; em "entre", `minimo` é o de baixo. */
export const comRegra = (
  g: GrupoDoCombo,
  modo: ModoDaRegra,
  quantidade: number,
  minimo = 1,
): GrupoDoCombo => {
  const n = Math.max(1, Math.round(quantidade));
  if (modo === 'exatamente') return comMaximoNasOpcoes({ ...g, minimo: n, maximo: n });
  if (modo === 'ate') return comMaximoNasOpcoes({ ...g, minimo: 0, maximo: n });
  const baixo = Math.max(0, Math.min(Math.round(minimo), n));
  return comMaximoNasOpcoes({ ...g, minimo: baixo, maximo: n });
};

/** Com repetição, cada opção pode ocupar o grupo inteiro; sem, entra uma vez. */
const comMaximoNasOpcoes = (g: GrupoDoCombo): GrupoDoCombo => ({
  ...g,
  opcoes: g.opcoes.map(o => ({ ...o, maximo: g.podeRepetir ? g.maximo : 1 })),
});

export const comRepeticao = (g: GrupoDoCombo, podeRepetir: boolean): GrupoDoCombo =>
  comMaximoNasOpcoes({ ...g, podeRepetir });

// ── Opções ─────────────────────────────────────────────────────────────────

const fotoDoProduto = (p: StoreProduct) => p.main_image_url || p.main_image || undefined;

export const adicionarProdutos = (g: GrupoDoCombo, produtos: StoreProduct[]): GrupoDoCombo => {
  const ja = new Set(g.opcoes.map(o => o.produtoId));
  const novas = produtos
    .filter(p => !ja.has(p.id))
    .map<OpcaoDoGrupo>(p => ({
      chave: p.id,
      produtoId: p.id,
      nome: p.name,
      preco: numero(p.price),
      maximo: g.podeRepetir ? g.maximo : 1,
      foto: fotoDoProduto(p),
    }));
  return { ...g, opcoes: [...g.opcoes, ...novas] };
};

export const removerOpcao = (g: GrupoDoCombo, chave: string): GrupoDoCombo => ({
  ...g,
  opcoes: g.opcoes.filter(o => o.chave !== chave),
});

export const escolherProdutoBase = (g: GrupoDoCombo, p: StoreProduct): GrupoDoCombo => ({
  ...g,
  produtoBaseId: p.id,
  opcoes: (p.variants || [])
    .filter(v => v.is_active !== false)
    .map<OpcaoDoGrupo>(v => ({
      chave: v.id,
      varianteId: v.id,
      nome: v.name,
      preco: numero(v.price ?? p.price),
      maximo: g.podeRepetir ? g.maximo : 1,
      estoque: v.stock_quantity,
      foto: v.image_url || fotoDoProduto(p),
    })),
});

export const marcarComoBrinde = (g: GrupoDoCombo): GrupoDoCombo => ({
  ...g,
  opcoes: g.opcoes.map(o => ({ ...o, precoProprio: 0 })),
});

export const ehBrinde = (g: GrupoDoCombo) =>
  g.opcoes.length > 0 && g.opcoes.every(o => o.precoProprio === 0);

/** Desconto em % sobre o preço de cada opção. 0 limpa o preço próprio. */
export const aplicarDesconto = (g: GrupoDoCombo, porcento: number): GrupoDoCombo => ({
  ...g,
  opcoes: g.opcoes.map(o => ({
    ...o,
    precoProprio: porcento > 0
      ? Math.round(o.preco * (1 - porcento / 100) * 100) / 100
      : undefined,
  })),
});

export const precoDaOpcao = (o: OpcaoDoGrupo) => o.precoProprio ?? o.preco;

// ── Leitura e gravação ─────────────────────────────────────────────────────

export const deCombo = (combo: StoreCombo, produtos: StoreProduct[]): RascunhoDoCombo => {
  const meta = { ...(combo.metadata || {}) } as Record<string, unknown>;
  const incluiBruto = meta.inclui;
  const inclui = typeof incluiBruto === 'string'
    ? (incluiBruto.trim() ? [incluiBruto] : [])
    : Array.isArray(incluiBruto) ? incluiBruto.map(String).filter(s => s.trim()) : [];
  const selos = opcional(meta.loyalty_units);
  delete meta.inclui;
  delete meta.loyalty_units;

  const porId = new Map(produtos.map(p => [p.id, p]));

  const grupos = [...(combo.groups || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map<GrupoDoCombo>(item => {
      const base = item.product_id ? porId.get(item.product_id) : undefined;
      const opcoesDeProduto = item.product_options || [];
      const tipo: TipoDeGrupo = opcoesDeProduto.length > 0 || !item.product_id ? 'produtos' : 'variantes';
      const minimo = numero(item.min_selections, 1);
      const opcoes: OpcaoDoGrupo[] = tipo === 'produtos'
        ? opcoesDeProduto.map(o => {
            const p = porId.get(o.product_id);
            return {
              chave: o.product_id,
              produtoId: o.product_id,
              nome: o.name || p?.name || '',
              preco: numero(o.price ?? p?.price),
              precoProprio: opcional(o.price_override),
              maximo: numero(o.max_selections, 1),
              estoque: o.stock,
              foto: o.image_url || (p ? fotoDoProduto(p) : undefined),
            };
          })
        : (item.variant_limits || []).map(l => {
            const v = base?.variants?.find(x => x.id === l.variant_id);
            return {
              chave: l.variant_id,
              varianteId: l.variant_id,
              nome: l.variant_name || v?.name || '',
              preco: numero(v?.price ?? base?.price),
              precoProprio: opcional(l.price_override),
              maximo: numero(l.max_selections, 1),
              estoque: l.stock,
              foto: v?.image_url || (base ? fotoDoProduto(base) : undefined),
            };
          });
      return {
        chave: item.id || novaChave('g'),
        tipo,
        titulo: item.title || '',
        produtoBaseId: item.product_id || undefined,
        minimo: item.is_required && minimo === 0 ? 1 : minimo,
        maximo: numero(item.max_selections, 1),
        podeRepetir: !!item.allow_duplicate_variants,
        opcoes,
      };
    });

  return {
    nome: combo.name || '',
    descricao: combo.description || '',
    preco: numero(combo.price),
    precoDe: opcional(combo.compare_at_price),
    precoPelaSoma: !!combo.dynamic_pricing,
    fotoUrl: combo.image_url || combo.image || '',
    ativo: combo.is_active !== false,
    destaque: !!combo.featured,
    controlarEstoque: !!combo.track_stock,
    estoque: numero(combo.stock_quantity),
    selos,
    inclui,
    metadataExtra: meta,
    grupos,
  };
};

export const paraPayload = (r: RascunhoDoCombo, storeId: string): StoreComboPayload => {
  const metadata: Record<string, unknown> = { ...r.metadataExtra };
  const inclui = r.inclui.map(s => s.trim()).filter(Boolean);
  if (inclui.length) metadata.inclui = inclui;
  if (r.selos && r.selos > 0) metadata.loyalty_units = Math.round(r.selos);

  const groups: ComboProductGroupInput[] = r.grupos.map((g, idx) => ({
    product_id: g.tipo === 'variantes' ? (g.produtoBaseId || null) : null,
    title: g.tipo === 'produtos' ? g.titulo.trim() : g.titulo.trim(),
    is_required: g.minimo > 0,
    min_selections: g.minimo,
    max_selections: g.maximo,
    allow_duplicate_variants: g.podeRepetir,
    position: idx,
    variant_limits: g.tipo === 'variantes'
      ? g.opcoes.map(o => ({ variant_id: o.varianteId!, max_selections: o.maximo, price_override: o.precoProprio }))
      : [],
    product_options: g.tipo === 'produtos'
      ? g.opcoes.map(o => ({ product_id: o.produtoId!, max_selections: o.maximo, price_override: o.precoProprio }))
      : [],
  }));

  return {
    store: storeId,
    name: r.nome.trim(),
    description: r.descricao.trim(),
    price: r.preco,
    compare_at_price: r.precoDe || undefined,
    image_url: r.fotoUrl.trim() || undefined,
    is_active: r.ativo,
    featured: r.destaque,
    track_stock: r.controlarEstoque,
    stock_quantity: r.controlarEstoque ? r.estoque : 0,
    dynamic_pricing: r.precoPelaSoma,
    metadata,
    groups,
  };
};

// ── Preço mostrado e pendências ────────────────────────────────────────────

/** O menor valor que um cliente consegue pagar pelo combo. */
export const precoAPartirDe = (r: RascunhoDoCombo): number => {
  if (!r.precoPelaSoma) return r.preco;
  const somaDosGrupos = r.grupos.reduce((soma, g) => {
    if (g.minimo === 0 || g.opcoes.length === 0) return soma;
    const precos = g.opcoes.map(precoDaOpcao).sort((a, b) => a - b);
    const parte = g.podeRepetir
      ? precos[0] * g.minimo
      : precos.slice(0, g.minimo).reduce((s, p) => s + p, 0);
    return soma + parte;
  }, 0);
  return Math.round((r.preco + somaDosGrupos) * 100) / 100;
};

export interface Pendencia {
  grupo: string | null;
  texto: string;
}

export const pendencias = (r: RascunhoDoCombo): Pendencia[] => {
  const lista: Pendencia[] = [];
  if (!r.nome.trim()) lista.push({ grupo: null, texto: 'Dê um nome' });
  if (!r.precoPelaSoma && !(r.preco > 0)) lista.push({ grupo: null, texto: 'Defina o preço' });
  r.grupos.forEach(g => {
    if (g.tipo === 'variantes' && !g.produtoBaseId) {
      lista.push({ grupo: g.chave, texto: 'Escolha o produto' });
    } else if (g.opcoes.length === 0) {
      lista.push({ grupo: g.chave, texto: 'Adicione opções' });
    } else if (!g.podeRepetir && g.opcoes.length < g.minimo) {
      lista.push({ grupo: g.chave, texto: `Faltam opções para escolher ${g.minimo}` });
    }
  });
  return lista;
};

/** Título que o cliente vê quando o lojista não escreveu um. */
export const tituloParaOCliente = (g: GrupoDoCombo, produtos: StoreProduct[]): string => {
  if (g.titulo.trim()) return g.titulo.trim();
  if (g.tipo === 'variantes') {
    const base = produtos.find(p => p.id === g.produtoBaseId);
    if (base) return base.name;
  }
  const { modo, a, b } = regraDoGrupo(g);
  if (modo === 'exatamente') return `Escolha ${b}`;
  if (modo === 'ate') return `Escolha até ${b}`;
  return `Escolha de ${a} a ${b}`;
};
