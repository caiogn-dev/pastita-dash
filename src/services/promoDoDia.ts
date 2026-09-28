/**
 * Promoção do dia automática — o backend cria a campanha sozinho na hora da loja.
 * A configuração mora em `store.metadata.promo_do_dia` e é salva pelo PATCH da loja.
 */
import api from './api';

export type ParaQuando = 'amanha' | 'hoje';
export type ModoDeEnvio = 'janela' | 'modelo';

export interface ConfigDaPromoDoDia {
  ativo: boolean;
  hora: string;
  para: ParaQuando;
  modo: ModoDeEnvio;
  modelo: string;
  cards: Record<string, string>;
  texto: string;
}

export interface PreviaDaPromo {
  dia: string;
  weekday: number;
  quando: string;
  ofertas: { nome: string; preco: string; de: string }[];
  card: string;
  texto: string;
  modo: ModoDeEnvio;
}

export interface EnvioDaPromo {
  id: string;
  nome: string;
  dia: string | null;
  modo: string | null;
  status: string;
  criada_em: string;
  enviadas: number;
  destinatarios: number;
}

export interface PainelDaPromoDoDia {
  config: ConfigDaPromoDoDia;
  previa: PreviaDaPromo | null;
  modelos: string[];
  historico: EnvioDaPromo[];
  tem_whatsapp: boolean;
}

export const promoDoDiaService = {
  async painel(store: string): Promise<PainelDaPromoDoDia> {
    const { data } = await api.get<PainelDaPromoDoDia>('/campaigns/promo-do-dia/', { params: { store } });
    return data;
  },
  async dispararAgora(store: string): Promise<{ motivo: string; campanha_id: string | null }> {
    const { data } = await api.post('/campaigns/promo-do-dia/', { acao: 'disparar' }, { params: { store } });
    return data;
  },
};
