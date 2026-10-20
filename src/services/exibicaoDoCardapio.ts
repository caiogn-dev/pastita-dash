/** Exibição do cardápio — como o produto aparece na vitrine (server2 93801683). */
import api from './api';

export type PosicaoDaFoto = 'padrao' | 'topo' | 'esquerda' | 'direita';
export type EncaixeDaFoto = 'cortar' | 'inteira';
export type FormatoDaFoto = 'padrao' | 'quadrada' | 'retangular' | 'paisagem';
export type FormatoDoLogo = 'padrao' | 'redondo' | 'quadrado';
export type AlinhamentoDoLogo = 'padrao' | 'esquerda' | 'centro';

export interface ExibicaoDoCardapio {
  descricao_limite: number;
  foto_posicao: PosicaoDaFoto;
  foto_encaixe: EncaixeDaFoto;
  foto_proporcao: FormatoDaFoto;
  mostrar_estoque_baixo: boolean;
  mostrar_esgotados: boolean;
  mostrar_peca_novamente: boolean;
  agradecimento_titulo: string;
  agradecimento_subtitulo: string;
  logo_formato: FormatoDoLogo;
  logo_alinhamento: AlinhamentoDoLogo;
}

/** Espelho do PADRAO do backend — só para a tela não nascer vazia. */
export const EXIBICAO_PADRAO: ExibicaoDoCardapio = {
  descricao_limite: 0,
  foto_posicao: 'padrao',
  foto_encaixe: 'cortar',
  foto_proporcao: 'padrao',
  mostrar_estoque_baixo: true,
  mostrar_esgotados: true,
  mostrar_peca_novamente: true,
  agradecimento_titulo: '',
  agradecimento_subtitulo: '',
  logo_formato: 'padrao',
  logo_alinhamento: 'padrao',
};

/** Só os campos que mudaram — o PATCH é parcial. */
export const diferencas = (antes: ExibicaoDoCardapio, depois: ExibicaoDoCardapio): Partial<ExibicaoDoCardapio> =>
  (Object.keys(depois) as (keyof ExibicaoDoCardapio)[]).reduce((acc, k) => {
    if (antes[k] !== depois[k]) (acc as Record<string, unknown>)[k] = depois[k];
    return acc;
  }, {} as Partial<ExibicaoDoCardapio>);

export const exibicaoDoCardapioService = {
  async ler(store: string): Promise<ExibicaoDoCardapio> {
    const { data } = await api.get<ExibicaoDoCardapio>('/stores/exibicao-do-cardapio/', { params: { store } });
    return { ...EXIBICAO_PADRAO, ...data };
  },
  async salvar(store: string, dados: Partial<ExibicaoDoCardapio>): Promise<ExibicaoDoCardapio> {
    const { data } = await api.patch<ExibicaoDoCardapio>('/stores/exibicao-do-cardapio/', dados, { params: { store } });
    return { ...EXIBICAO_PADRAO, ...data };
  },
};

/** Um produto de verdade da loja, para os desenhos da Exibição. */
export interface AmostraDoCardapio {
  nome: string;
  descricao: string;
  foto: string;
  preco: number;
}

interface ItemDoCatalogo {
  name?: string;
  description?: string;
  short_description?: string;
  main_image_url?: string;
  main_image?: string;
  image_url?: string;
  image?: string;
  price?: string | number;
  preco_vigente?: string | number | null;
}

const fotoDo = (i: ItemDoCatalogo) => i.main_image_url || i.main_image || i.image_url || i.image || '';
const descricaoDo = (i: ItemDoCatalogo) => (i.description || i.short_description || '').trim();

/**
 * Produto com foto e a descrição mais longa — é o que melhor mostra o corte
 * do "ver mais" e a diferença entre "Cortar" e "Inteira". Sem produto, combo.
 */
export function escolherAmostra(
  catalogo: { products?: ItemDoCatalogo[]; combos?: ItemDoCatalogo[] } | null | undefined
): AmostraDoCardapio | null {
  const candidatos = [...(catalogo?.products || []), ...(catalogo?.combos || [])].filter((i) => i?.name);
  if (!candidatos.length) return null;
  const pontos = (i: ItemDoCatalogo) => (fotoDo(i) ? 10000 : 0) + Math.min(descricaoDo(i).length, 9999);
  const melhor = candidatos.reduce((a, b) => (pontos(b) > pontos(a) ? b : a));
  return {
    nome: melhor.name as string,
    descricao: descricaoDo(melhor),
    foto: fotoDo(melhor),
    preco: Number(melhor.preco_vigente ?? melhor.price ?? 0) || 0,
  };
}

const MARCAS = /(\*\*|__|~~|\*|_)(.+?)\1/g;

/**
 * Espelho de `resumirDescricao` da vitrine (cardapidex-web
 * src/utils/exibicaoDoCardapio.js): mesmo corte na última palavra inteira.
 * `null` = automático (a vitrine corta por linhas).
 */
export const LIMITE_MINIMO_DA_DESCRICAO = 60;

export function resumirDescricao(texto: string, limiteEscolhido: number): { texto: string; cortou: boolean } | null {
  if (!limiteEscolhido || limiteEscolhido <= 0) return null;
  // Menos que isso nem o nome do prato cabe ("Escondidinho de… ver mais").
  const limite = Math.max(limiteEscolhido, LIMITE_MINIMO_DA_DESCRICAO);
  const limpo = String(texto || '')
    .split('\n').map((l) => l.trim()).filter(Boolean).join(' ')
    .replace(MARCAS, '$2')
    .replace(/\s+/g, ' ')
    .trim();
  if (limpo.length <= limite) return { texto: limpo, cortou: false };
  const corte = limpo.slice(0, limite + 1);
  const ultimoEspaco = corte.lastIndexOf(' ');
  const base = (ultimoEspaco > limite * 0.5 ? corte.slice(0, ultimoEspaco) : limpo.slice(0, limite))
    .replace(/[\s,.;:–—-]+$/, '');
  return { texto: `${base}…`, cortou: true };
}

export const catalogoDaLojaService = {
  /** Catálogo público — o mesmo que a vitrine desenha. */
  async ler(store: string) {
    const { data } = await api.get(`/stores/${store}/catalog/`);
    return data as { products?: ItemDoCatalogo[]; combos?: ItemDoCatalogo[] };
  },
};
