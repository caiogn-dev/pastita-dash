/**
 * Promoção de comentário no Instagram.
 *
 * A loja amarra uma promoção a UMA publicação: quem comenta recebe a mensagem
 * no direct. A Meta só permite uma resposta privada por comentário, em até 7
 * dias — por isso cada comentário vale uma participação.
 */
import api, { normalizePaginatedResponse } from './api';

export type TipoDaPromocao = 'CUPOM' | 'SORTEIO';

export interface PromocaoDeComentario {
  id: string;
  account: string;
  nome: string;
  tipo: TipoDaPromocao;
  media_id: string;
  palavra_chave: string;
  exige_marcar_amigos: number;
  exige_seguir: boolean;
  mensagem_dm: string;
  resposta_publica: string;
  comeca_em: string | null;
  termina_em: string | null;
  ativa: boolean;
  participando: number;
  no_ar: boolean;
  created_at: string;
}

export interface Participante {
  id: string;
  username: string;
  texto: string;
  amigos_marcados: number;
  aceita: boolean;
  motivo: string;
  motivo_em_portugues: string;
  dm_enviada: boolean;
  ganhador: boolean;
  created_at: string;
}

export interface PlacarDaPromocao {
  participando: number;
  de_fora: number;
  ganhadores: Participante[];
  motivos: { motivo: string; quantas: number }[];
}

export type NovaPromocao = Partial<PromocaoDeComentario> & {
  account: string;
  nome: string;
  media_id: string;
  mensagem_dm: string;
};

export interface PublicacaoDaConta {
  id: string;
  legenda: string;
  imagem: string | null;
  link: string | null;
  tipo: string;
  quando: string;
  comentarios: number;
}

export type SituacaoDoComentario = 'recebeu' | 'participando' | 'de_fora' | 'aguardando';

export interface ComentarioDoPost {
  id: string;
  username: string;
  texto: string;
  quando: string;
  curtidas: number;
  situacao: SituacaoDoComentario;
  motivo: string;
  ganhador: boolean;
}

const RAIZ = '/instagram/campanhas-de-comentario';

export const instagramCampanhasService = {
  /** As publicações da conta, direto da Meta — é o que a grade mostra. */
  publicacoes: async (contaId: string): Promise<PublicacaoDaConta[]> => {
    const response = await api.get(`/instagram/accounts/${contaId}/publicacoes/`);
    return Array.isArray(response.data) ? response.data : [];
  },

  listar: async (): Promise<PromocaoDeComentario[]> => {
    const response = await api.get(`${RAIZ}/`);
    return normalizePaginatedResponse<PromocaoDeComentario>(response.data);
  },

  criar: async (dados: NovaPromocao): Promise<PromocaoDeComentario> => {
    const response = await api.post(`${RAIZ}/`, dados);
    return response.data;
  },

  atualizar: async (id: string, dados: Partial<PromocaoDeComentario>): Promise<PromocaoDeComentario> => {
    const response = await api.patch(`${RAIZ}/${id}/`, dados);
    return response.data;
  },

  placar: async (id: string): Promise<PlacarDaPromocao> => {
    const response = await api.get(`${RAIZ}/${id}/placar/`);
    const d = response.data ?? {};
    return {
      participando: Number(d.participando ?? 0),
      de_fora: Number(d.de_fora ?? 0),
      ganhadores: Array.isArray(d.ganhadores) ? d.ganhadores : [],
      motivos: Array.isArray(d.motivos) ? d.motivos : [],
    };
  },

  participantes: async (id: string, somenteValidos = false): Promise<Participante[]> => {
    const response = await api.get(`${RAIZ}/${id}/participantes/`, {
      params: somenteValidos ? { validos: '1' } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Os comentários do post agora, com o que aconteceu com cada um. */
  comentarios: async (id: string): Promise<ComentarioDoPost[]> => {
    const response = await api.get(`${RAIZ}/${id}/comentarios/`);
    return Array.isArray(response.data) ? response.data : [];
  },

  sortear: async (id: string, quantidade = 1): Promise<{ ganhadores: Participante[]; restam: number }> => {
    const response = await api.post(`${RAIZ}/${id}/sortear/`, { quantidade });
    return {
      ganhadores: response.data?.ganhadores ?? [],
      restam: Number(response.data?.restam ?? 0),
    };
  },
};

export default instagramCampanhasService;
