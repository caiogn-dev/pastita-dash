/**
 * O painel do recuperador de vendas.
 *
 * Os lembretes de carrinho rodam desde sempre e ninguém via o resultado. A
 * conta mora no servidor (`stores/services/recuperacao.py`) — aqui só o
 * transporte.
 */
import api from './api';

export interface PainelDeRecuperacao {
  dias: number;
  abandonados: number;
  valor_abandonado: number;
  ticket_medio: number;
  mensagens_enviadas: number;
  recuperados: number;
  valor_recuperado: number;
  taxa_de_recuperacao: number;
  oportunidade_perdida: number;
  /** Carrinhos com itens e SEM telefone: o lembrete não tem para onde ir. */
  sem_telefone: number;
}

export const recuperacaoService = {
  painel: async (storeSlug: string, dias = 30): Promise<PainelDeRecuperacao> => {
    const response = await api.get(`/stores/${storeSlug}/recuperacao/`, { params: { dias } });
    return response.data;
  },
};

export default recuperacaoService;
