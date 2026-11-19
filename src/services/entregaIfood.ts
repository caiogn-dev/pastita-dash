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
  /** O servidor permite (re)chamar agora: "Chamar entregador iFood" / "Chamar de novo". */
  pode_chamar: boolean;
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
  /** Cliente pediu para entregar em outro endereço; a loja aceita ou recusa. */
  mudanca_endereco: MudancaDeEndereco | null;
}

export interface MudancaDeEndereco {
  status: 'PEDIDA';
  /** Endereço novo, pronto para ler. */
  texto: string;
  /** ISO, ou "" sem prazo. */
  prazo: string;
  endereco: Record<string, unknown>;
}

export interface MotivoDeCancelamentoDaEntrega { codigo: string; descricao: string }

const base = (pedidoId: string) => `/stores/orders/${pedidoId}/entrega-ifood/`;

export const entregaIfoodService = {
  estado: async (pedidoId: string): Promise<EntregaIfood> => (await api.get(base(pedidoId))).data,
  chamar: async (pedidoId: string): Promise<EntregaIfood> => (await api.post(`${base(pedidoId)}chamar/`)).data,
  /** Vazia = o iFood não deixa mais cancelar. */
  motivosDeCancelamento: async (pedidoId: string): Promise<MotivoDeCancelamentoDaEntrega[]> =>
    ((await api.get(`${base(pedidoId)}motivos-cancelamento/`)).data as { motivos?: MotivoDeCancelamentoDaEntrega[] }).motivos ?? [],
  cancelar: async (pedidoId: string, codigo: string): Promise<EntregaIfood> =>
    (await api.post(`${base(pedidoId)}cancelar/`, { codigo })).data,
  responderEndereco: async (pedidoId: string, aceitar: boolean): Promise<EntregaIfood> =>
    (await api.post(`${base(pedidoId)}endereco/`, { aceitar })).data,
};
