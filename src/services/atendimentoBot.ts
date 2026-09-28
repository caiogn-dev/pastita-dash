/**
 * O que o bot sabe de uma conversa e o que ele não entendeu.
 *
 * - `contexto-do-bot`: carrinho e cliente que o bot montou na conversa — é o
 *   que o "Criar pedido desta conversa" usa para não redigitar nada.
 * - `nao-entendi`: onde a IA falhou de verdade, para o lojista ensinar
 *   (é um produto / ensinar a resposta / virar regra da loja / ignorar).
 * - `conhecimento`: as perguntas e respostas que o dono ensinou à IA.
 */
import api from './api';

export interface ItemDoCarrinhoDoBot {
  nome: string;
  quantidade: number;
  preco?: number | string | null;
}

export interface ContextoDoBot {
  carrinho?: {
    itens?: ItemDoCarrinhoDoBot[];
    endereco?: unknown;
    taxa?: number | string | null;
    notas?: string | null;
    entrega?: unknown;
  } | null;
  cliente?: {
    nome?: string | null;
    telefone?: string | null;
    pedidos?: number | null;
    ultimo_pedido?: unknown;
  } | null;
  [chave: string]: unknown;
}

export interface MensagemNaoEntendida {
  id: string;
  conversa_id: string | null;
  telefone: string;
  texto: string;
  quando: string;
  resposta_do_bot: string;
  vezes: number;
}

export type Ensino =
  | { texto: string; acao: 'produto'; produto_id: string }
  | { texto: string; acao: 'resposta'; resposta: string }
  | { texto: string; acao: 'regra'; tema: string; resposta: string }
  | { texto: string; acao: 'ignorar' };

/** Pergunta e resposta que o dono ensinou. A IA lê como exemplo de bom atendimento. */
export interface Conhecimento {
  id: string;
  topic: string;
  example_input: string;
  example_response: string;
  notes?: string;
  is_active: boolean;
  updated_at?: string;
}

export type ConhecimentoInput = Pick<Conhecimento, 'example_input' | 'example_response'> & { topic?: string };

export const atendimentoBotService = {
  async getContextoDoBot(conversaId: string): Promise<ContextoDoBot> {
    const { data } = await api.get<ContextoDoBot>(`/conversations/${conversaId}/contexto-do-bot/`);
    return data ?? {};
  },

  async listarNaoEntendi(params: { store?: string; dias: number; todas?: boolean }): Promise<MensagemNaoEntendida[]> {
    const { todas, ...resto } = params;
    const { data } = await api.get<MensagemNaoEntendida[] | { results?: MensagemNaoEntendida[] }>(
      '/conversations/nao-entendi/',
      { params: todas ? { ...resto, todas: 1 } : resto },
    );
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.results) ? data.results : [];
  },

  async ensinar(ensino: Ensino, store?: string): Promise<void> {
    await api.post('/conversations/nao-entendi/ensinar/', ensino, { params: store ? { store } : undefined });
  },
};

export type MotivoDaPerda = 'atendente' | 'carrinho' | 'bot_falhou' | 'so_perguntou';

export interface ConversaPerdida {
  conversa_id: string;
  telefone: string;
  nome: string;
  quando: string | null;
  motivo: MotivoDaPerda;
  ultima_mensagem: string;
}

export interface ConversaoDoBot {
  dias: number;
  conversas: number;
  pedidos: number;
  receita: string;
  taxa: number;
  para_atendente: number;
  carrinho_parado: number;
  bot_falhou: number;
  motivos_de_atendente: { motivo: string; vezes: number }[];
  serie: { dia: string; conversas: number; pedidos: number }[];
  perdidas: ConversaPerdida[];
}

export const conversaoDoBotService = {
  async buscar(params: { store?: string; dias: number }): Promise<ConversaoDoBot> {
    const { data } = await api.get<ConversaoDoBot>('/conversations/bot/conversao/', { params });
    return data;
  },
};

export const conhecimentoService = {
  async listar(store: string): Promise<Conhecimento[]> {
    const { data } = await api.get<Conhecimento[] | { results?: Conhecimento[] }>('/agents/conhecimento/', { params: { store } });
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.results) ? data.results : [];
  },
  async criar(store: string, dados: ConhecimentoInput): Promise<Conhecimento> {
    const { data } = await api.post<Conhecimento>('/agents/conhecimento/', dados, { params: { store } });
    return data;
  },
  async editar(store: string, id: string, dados: Partial<ConhecimentoInput> & { is_active?: boolean }): Promise<Conhecimento> {
    const { data } = await api.patch<Conhecimento>(`/agents/conhecimento/${id}/`, dados, { params: { store } });
    return data;
  },
  async apagar(store: string, id: string): Promise<void> {
    await api.delete(`/agents/conhecimento/${id}/`, { params: { store } });
  },
};
