/**
 * Ações de homologação do iFood sobre pedido que VEIO do iFood: cancelar com
 * o motivo do iFood e responder à Plataforma de Negociação. Só transporte.
 */
import api from './api';

export interface MotivoDeCancelamentoIfood { codigo: string; descricao: string }

export type StatusDaDisputa = 'ABERTA' | 'RESPONDIDA' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'ALTERNATIVE_REPLIED';
export type AcaoDaDisputa = 'CANCELLATION' | 'PARTIAL_CANCELLATION' | 'PROPOSED_AMOUNT_REFUND' | 'PROPOSED_ADDITIONAL_TIME';

export interface AlternativaDaDisputa {
  id: string;
  type: 'REFUND' | 'BENEFIT' | 'ADDITIONAL_TIME';
  metadata: {
    /** `value` em centavos, como string. */
    maxAmount?: { value: string; currency: string };
    allowedsAdditionalTimeInMinutes?: number[];
    allowedsAdditionalTimeReasons?: string[];
  };
}

export interface DisputaIfood {
  id: string;
  status: StatusDaDisputa;
  acao: AcaoDaDisputa;
  tipo: 'AFTER_DELIVERY' | 'DELAY' | 'PREPARATION_TIME' | 'AFTER_DELIVERY_PARTIALLY';
  mensagem: string;
  expira_em: string;
  se_nao_responder: 'ACCEPT_CANCELLATION' | 'REJECT_CANCELLATION' | 'VOID';
  motivos_aceite: string[];
  alternativas: AlternativaDaDisputa[];
  evidencias: string[];
}

export interface RespostaDaDisputa {
  resposta: 'aceitar' | 'recusar' | 'alternativa';
  motivo?: string;
  detalhe?: string;
  tipo?: AlternativaDaDisputa['type'];
  valor_centavos?: number;
  minutos?: number;
}

const base = (pedidoId: string) => `/stores/orders/${pedidoId}/ifood/`;

export const ifoodPedidoService = {
  motivosDeCancelamento: async (pedidoId: string): Promise<MotivoDeCancelamentoIfood[]> =>
    ((await api.get(`${base(pedidoId)}motivos-cancelamento/`)).data as { motivos: MotivoDeCancelamentoIfood[] }).motivos ?? [],
  cancelar: async (pedidoId: string, codigo: string, detalhe?: string): Promise<{ status: string; ifood: unknown }> =>
    (await api.post(`${base(pedidoId)}cancelar/`, detalhe ? { codigo, detalhe } : { codigo })).data,
  negociacao: async (pedidoId: string): Promise<DisputaIfood | null> =>
    ((await api.get(`${base(pedidoId)}negociacao/`)).data as { disputa: DisputaIfood | null }).disputa ?? null,
  responder: async (pedidoId: string, resposta: RespostaDaDisputa): Promise<DisputaIfood | null> =>
    ((await api.post(`${base(pedidoId)}negociacao/`, resposta)).data as { disputa: DisputaIfood | null }).disputa ?? null,
};
