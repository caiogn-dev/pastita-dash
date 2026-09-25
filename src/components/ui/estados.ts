/**
 * Status → rótulo e tom, num lugar só. Pedidos e Pagamentos tinham cada um o
 * seu mapa, com paletas diferentes para o mesmo "pago".
 */
import type { BadgeTone } from './Badge';

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
  // O WhatsApp chama de `running` o que o e-mail chama de `sending`.
  running: { rotulo: 'Enviando', tone: 'info' },
  sent: { rotulo: 'Enviada', tone: 'success' },
  completed: { rotulo: 'Enviada', tone: 'success' },
  paused: { rotulo: 'Pausada', tone: 'warning' },
  failed: { rotulo: 'Falhou', tone: 'danger' },
  cancelled: { rotulo: 'Cancelada', tone: 'neutral' },
};

export function estadoDeCampanha(status?: string | null): Estado {
  return CAMPANHA[(status || '').toLowerCase()] ?? { rotulo: status || '—', tone: 'neutral' };
}

/**
 * Status do pedido — a cor do quadro de pedidos. Uma coluna por etapa, e todo
 * sinônimo que o backend usa numa etapa cai no MESMO tom (testado contra
 * `orderColumns.ts`). Antes cada coluna trazia uma paleta crua própria.
 *
 *   recebido    → warning  pede ação: confirmar
 *   confirmado  → info     na fila da cozinha
 *   preparando  → brand    a etapa em curso, no ouro da marca
 *   saiu/pronto → success  despachado
 *   entregue    → neutral  acabou, não pede mais nada
 */
const PEDIDO: Record<string, Estado> = {
  pending: { rotulo: 'Pendente', tone: 'warning' },
  processing: { rotulo: 'Processando', tone: 'warning' },
  awaiting_payment: { rotulo: 'Aguardando pagamento', tone: 'warning' },
  payment_pending: { rotulo: 'Aguardando pagamento', tone: 'warning' },
  confirmed: { rotulo: 'Confirmado', tone: 'info' },
  paid: { rotulo: 'Pago', tone: 'info' },
  payment_confirmed: { rotulo: 'Pagamento confirmado', tone: 'info' },
  preparing: { rotulo: 'Preparando', tone: 'brand' },
  ready: { rotulo: 'Pronto', tone: 'success' },
  out_for_delivery: { rotulo: 'Saiu para entrega', tone: 'success' },
  shipped: { rotulo: 'Enviado', tone: 'success' },
  delivered: { rotulo: 'Entregue', tone: 'neutral' },
  completed: { rotulo: 'Concluído', tone: 'neutral' },
  // Cancelado é fim, não falha — neutro, igual ao pagamento.
  cancelled: { rotulo: 'Cancelado', tone: 'neutral' },
  failed: { rotulo: 'Falhou', tone: 'danger' },
  refunded: { rotulo: 'Estornado', tone: 'neutral' },
};

/** O NOSSO rótulo primeiro; o do backend (`status_display`) como reserva para
 *  status novo sem tradução — nunca "Delivered" para o dono da loja. */
export function estadoDePedido(status?: string | null, rotuloDoBackend?: string | null): Estado {
  const chave = (status || '').toLowerCase();
  return PEDIDO[chave] ?? { rotulo: rotuloDoBackend || status || '—', tone: 'neutral' };
}

/** Prazo de um pedido em aberto (régua de `orderSla.ts`): no prazo não grita. */
export type Prazo = 'ok' | 'warning' | 'critical';

const PRAZO: Record<Prazo, BadgeTone> = { ok: 'neutral', warning: 'warning', critical: 'danger' };

export function tomDoPrazo(prazo: Prazo): BadgeTone {
  return PRAZO[prazo];
}

/** Envio para UMA pessoa (destinatário de e-mail ou de WhatsApp). O modal de
 *  destinatários do e-mail tinha a sua cadeia de ternários de tom. */
const ENVIO: Record<string, Estado> = {
  pending: { rotulo: 'Na fila', tone: 'neutral' },
  sent: { rotulo: 'Enviado', tone: 'neutral' },
  delivered: { rotulo: 'Entregue', tone: 'success' },
  read: { rotulo: 'Lida', tone: 'success' },
  opened: { rotulo: 'Abriu', tone: 'success' },
  clicked: { rotulo: 'Clicou', tone: 'success' },
  skipped: { rotulo: 'Pulado', tone: 'warning' },
  unsubscribed: { rotulo: 'Saiu da lista', tone: 'warning' },
  bounced: { rotulo: 'Devolvido', tone: 'danger' },
  failed: { rotulo: 'Falhou', tone: 'danger' },
};

export function estadoDeEnvio(status?: string | null): Estado {
  return ENVIO[(status || '').toLowerCase()] ?? { rotulo: status || '—', tone: 'neutral' };
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

// ─── Automação (e-mail automático, mensagem automática do WhatsApp) ─────────

/** As duas telas de automação diziam "Ativa/Pausada" e "Ativo/Inativo" para a
 *  mesma coisa, cada uma com a sua paleta (uma em verde cru). */
export function estadoDeAutomacao(ativa?: boolean | null): Estado {
  return ativa ? { rotulo: 'Ativa', tone: 'success' } : { rotulo: 'Pausada', tone: 'neutral' };
}

// ─── Conversa (WhatsApp, Instagram, Messenger) ───────────────────────────────

const CONVERSA: Record<string, Estado> = {
  open: { rotulo: 'Aberta', tone: 'info' },
  // O agregador de conversas manda `active` quando a plataforma não tem status.
  active: { rotulo: 'Aberta', tone: 'info' },
  pending: { rotulo: 'Aguardando', tone: 'warning' },
  resolved: { rotulo: 'Resolvida', tone: 'success' },
  closed: { rotulo: 'Encerrada', tone: 'neutral' },
};

/** Status da conversa. A tela escrevia "Status: active" cru, em inglês. */
export function estadoDeConversa(status?: string | null): Estado {
  const chave = (status || 'open').toLowerCase();
  return CONVERSA[chave] ?? { rotulo: status || '—', tone: 'neutral' };
}

const MODO: Record<string, Estado> = {
  auto: { rotulo: 'Robô', tone: 'neutral' },
  // Com atendente o robô fica calado: é o que o dono precisa ver de relance.
  human: { rotulo: 'Atendente', tone: 'warning' },
  hybrid: { rotulo: 'Robô e atendente', tone: 'info' },
};

/** Quem responde a conversa agora. */
export function modoDeAtendimento(modo?: string | null): Estado {
  return MODO[(modo || 'auto').toLowerCase()] ?? { rotulo: modo || '—', tone: 'neutral' };
}
