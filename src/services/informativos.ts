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
}

export type InformativoInput = Partial<Pick<Informativo, 'titulo' | 'texto' | 'inicio' | 'fim' | 'ativo'>>;

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
  async apagar(store: string, id: string): Promise<void> {
    await api.delete(`/stores/informativos/${id}/`, { params: { store } });
  },
};
