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
