/**
 * Status → rótulo e tom, num lugar só. Pedidos e Pagamentos tinham cada um o
 * seu mapa, com paletas diferentes para o mesmo "pago".
 */
import type { BadgeTone } from './Badge';
import { STATUS_LABELS } from '../../utils/rotulosDeEstado';

export interface Estado { rotulo: string; tone: BadgeTone }

const PAGAMENTO: Record<string, Estado> = {
  pending: { rotulo: 'Pendente', tone: 'warning' },
  processing: { rotulo: 'Processando', tone: 'info' },
  paid: { rotulo: 'Pago', tone: 'success' },
  approved: { rotulo: 'Pago', tone: 'success' },
  failed: { rotulo: 'Falhou', tone: 'danger' },
  cancelled: { rotulo: 'Cancelado', tone: 'neutral' },
  refunded: { rotulo: 'Estornado', tone: 'neutral' },
  partially_refunded: { rotulo: 'Estorno parcial', tone: 'warning' },
};

export function estadoDePagamento(status?: string | null, metodo?: string | null): Estado {
  const chave = (status || 'pending').toLowerCase();
  const dinheiro = ['cash', 'dinheiro'].includes((metodo || '').toLowerCase());
  if (dinheiro && chave === 'pending') return { rotulo: 'Dinheiro', tone: 'warning' };
  return PAGAMENTO[chave] ?? { rotulo: status || '—', tone: 'neutral' };
}

const CAMPANHA: Record<string, Estado> = {
  draft: { rotulo: 'Rascunho', tone: 'neutral' },
  scheduled: { rotulo: 'Agendada', tone: 'info' },
  sending: { rotulo: 'Enviando', tone: 'info' },
  sent: { rotulo: 'Enviada', tone: 'success' },
  completed: { rotulo: 'Enviada', tone: 'success' },
  paused: { rotulo: 'Pausada', tone: 'warning' },
  failed: { rotulo: 'Falhou', tone: 'danger' },
  cancelled: { rotulo: 'Cancelada', tone: 'neutral' },
};

export function estadoDeCampanha(status?: string | null): Estado {
  return CAMPANHA[(status || '').toLowerCase()] ?? { rotulo: status || '—', tone: 'neutral' };
}

// ─── Pedido ──────────────────────────────────────────────────────────────────
// O rótulo vem de `utils/rotulosDeEstado` (a catraca de tradução); aqui mora o
// TOM. Dashboard e Clientes tinham cada um o seu mapa: "Preparando" era
// amarelo numa tela e laranja na outra, "Cancelado" vermelho como se fosse falha.

const TOM_DO_PEDIDO: Record<string, BadgeTone> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  preparing: 'info',
  shipped: 'info',
  out_for_delivery: 'info',
  ready: 'success',
  paid: 'success',
  delivered: 'success',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
};

/**
 * Estado do pedido. O NOSSO rótulo primeiro, o do backend (`status_display`)
 * como reserva: pedido em cache ou status novo sem tradução não pode devolver
 * "Delivered" para o dono da loja.
 */
export function estadoDePedido(status?: string | null, rotuloDoBackend?: string | null): Estado {
  const chave = (status || '').toLowerCase();
  const rotulo = STATUS_LABELS[chave] ?? rotuloDoBackend ?? (status || '—');
  return { rotulo, tone: TOM_DO_PEDIDO[chave] ?? 'neutral' };
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

export function estadoDeCliente(ativo?: boolean | null): Estado {
  return ativo ? { rotulo: 'Ativo', tone: 'success' } : { rotulo: 'Inativo', tone: 'neutral' };
}

/** Segmento RFM + o que ele significa em uma linha — o rótulo sozinho não age. */
export interface EstadoDeSegmento extends Estado { dica: string }

const SEGMENTO: Record<string, EstadoDeSegmento> = {
  campeoes: { rotulo: 'Campeão', tone: 'success', dica: 'compra muito e recente' },
  leais: { rotulo: 'Leal', tone: 'success', dica: 'volta sempre' },
  novos: { rotulo: 'Novo', tone: 'neutral', dica: 'primeira compra recente' },
  em_risco: { rotulo: 'Em risco', tone: 'warning', dica: 'comprava e parou' },
  perdidos: { rotulo: 'Perdido', tone: 'danger', dica: 'sumiu faz tempo' },
  sem_pedido: { rotulo: 'Sem pedido', tone: 'neutral', dica: 'cadastrado, nunca comprou' },
};

/** `null` sem segmento conhecido: sem selo é melhor que selo inventado. */
export function estadoDeSegmento(segmento?: string | null): EstadoDeSegmento | null {
  return (segmento && SEGMENTO[segmento]) || null;
}

// ─── Saúde do sistema (card de staff na home) ────────────────────────────────

const SAUDE: Record<string, Estado> = {
  ok: { rotulo: 'Estável', tone: 'success' },
  attention: { rotulo: 'Atenção', tone: 'warning' },
  critical: { rotulo: 'Crítico', tone: 'danger' },
};

export function estadoDeSaude(status?: string | null): Estado {
  return SAUDE[status || ''] ?? { rotulo: 'Indefinido', tone: 'neutral' };
}
