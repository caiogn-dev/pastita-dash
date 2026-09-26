/**
 * O que o bot sabe de uma conversa e o que ele não entendeu.
 *
 * - `contexto-do-bot`: carrinho e cliente que o bot montou na conversa — é o
 *   que o "Criar pedido desta conversa" usa para não redigitar nada.
 * - `nao-entendi`: mensagens que caíram em "não entendi", para o lojista
 *   ensinar (é um produto / responder assim / ignorar).
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
  | { texto: string; acao: 'ignorar' };

export const atendimentoBotService = {
  async getContextoDoBot(conversaId: string): Promise<ContextoDoBot> {
    const { data } = await api.get<ContextoDoBot>(`/conversations/${conversaId}/contexto-do-bot/`);
    return data ?? {};
  },

  async listarNaoEntendi(params: { store?: string; dias: number }): Promise<MensagemNaoEntendida[]> {
    const { data } = await api.get<MensagemNaoEntendida[] | { results?: MensagemNaoEntendida[] }>(
      '/conversations/nao-entendi/',
      { params },
    );
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.results) ? data.results : [];
  },

  async ensinar(ensino: Ensino): Promise<void> {
    await api.post('/conversations/nao-entendi/ensinar/', ensino);
  },
};
