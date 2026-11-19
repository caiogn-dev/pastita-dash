/**
 * iFood Entrega (Sob Demanda) para pedidos do próprio site/WhatsApp: a loja
 * chama um entregador do iFood a partir do pedido. A credencial é da
 * plataforma; aqui só o transporte.
 */
import api from './api';

export interface EntregaIfood {
  /** A loja tem iFood Entrega ligado. Falso = o bloco não aparece. */
  disponivel: boolean;
  /** Já existe entrega iFood para o pedido. */
  chamado: boolean;
  /** Código cru do iFood. */
  status: string;
  status_texto: string;
  /** Em andamento — dá para cancelar. */
  ativo: boolean;
  rastreio_url: string;
  /** O entregador pede ao cliente na entrega. */
  codigo_entrega: string;
  entregador: { nome: string; telefone: string } | null;
  /** Quanto o iFood cobra da loja pela entrega. */
  valor: number | null;
  /** Última falha, curta. */
  erro: string;
}

const base = (pedidoId: string) => `/stores/orders/${pedidoId}/entrega-ifood/`;

export const entregaIfoodService = {
  estado: async (pedidoId: string): Promise<EntregaIfood> => (await api.get(base(pedidoId))).data,
  chamar: async (pedidoId: string): Promise<EntregaIfood> => (await api.post(`${base(pedidoId)}chamar/`)).data,
  cancelar: async (pedidoId: string, motivo?: string): Promise<EntregaIfood> =>
    (await api.post(`${base(pedidoId)}cancelar/`, motivo ? { motivo } : {})).data,
};
