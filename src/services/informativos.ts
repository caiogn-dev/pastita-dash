/** Informativos — avisos da loja no cardápio (server2 7ee4e27). */
import api from './api';

export type EstadoDoInformativo = 'no_ar' | 'agendado' | 'encerrado' | 'pausado';

export interface Informativo {
  id: string;
  titulo: string;
  texto: string;
  inicio: string | null;
  fim: string | null;
  ativo: boolean;
  estado: EstadoDoInformativo;
  /** 'modal' abre ao entrar no cardápio; 'faixa' fica no topo. Antigos vêm sem. */
  formato?: FormatoDoInformativo;
  frequencia?: FrequenciaDoInformativo;
  imagem_url?: string;
  botao_texto?: string;
  botao_link?: string;
}

export type FormatoDoInformativo = 'modal' | 'faixa';
export type FrequenciaDoInformativo = 'uma_vez' | 'toda_visita';

export type InformativoInput = Partial<Pick<Informativo,
  'titulo' | 'texto' | 'inicio' | 'fim' | 'ativo' | 'formato' | 'frequencia' | 'imagem_url' | 'botao_texto' | 'botao_link'>>;

export const informativosService = {
  async listar(store: string): Promise<Informativo[]> {
    const { data } = await api.get<Informativo[]>('/stores/informativos/', { params: { store } });
    return Array.isArray(data) ? data : [];
  },
  async criar(store: string, dados: InformativoInput): Promise<Informativo> {
    const { data } = await api.post<Informativo>('/stores/informativos/', dados, { params: { store } });
    return data;
  },
  async editar(store: string, id: string, dados: InformativoInput): Promise<Informativo> {
    const { data } = await api.patch<Informativo>(`/stores/informativos/${id}/`, dados, { params: { store } });
    return data;
  },
  async enviarImagem(store: string, id: string, arquivo: File): Promise<Informativo> {
    const form = new FormData();
    form.append('image', arquivo);
    const { data } = await api.post<Informativo>(`/stores/informativos/${id}/imagem/`, form, { params: { store } });
    return data;
  },
  async apagar(store: string, id: string): Promise<void> {
    await api.delete(`/stores/informativos/${id}/`, { params: { store } });
  },
};
