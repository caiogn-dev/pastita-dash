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
