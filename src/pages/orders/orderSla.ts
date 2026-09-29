// SLA de preparo: o tempo exibido no card conta a partir da etapa atual,
// não da criação do pedido — e o painel mostra a média confirmado→pronto.

interface OrderTimestamps {
  status: string;
  created_at: string;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
}

/** Início da etapa atual do pedido (para elapsed por etapa no kanban). */
export const getStageStart = (order: OrderTimestamps): string => {
  const s = (order.status || '').toLowerCase();
  if (s === 'preparing') {
    return order.preparing_at || order.confirmed_at || order.created_at;
  }
  if (['confirmed', 'paid', 'payment_confirmed'].includes(s)) {
    return order.confirmed_at || order.created_at;
  }
  if (['out_for_delivery', 'ready', 'shipped'].includes(s)) {
    return order.ready_at || order.preparing_at || order.confirmed_at || order.created_at;
  }
  return order.created_at;
};

/**
 * Tempo típico de cozinha, em minutos; null sem dados.
 *
 * Era a média confirmado→pronto de tudo, e o quadro mostrava "Preparo médio:
 * 843min": pedido AGENDADO é confirmado dias antes e só fica pronto no dia, e
 * pedido que alguém esqueceu de avançar vira 24 h. Agora: fora agendado, usa
 * preparing_at→ready_at quando existe, descarta o que passa de 4 h (não é
 * cozinha) e fica com a MEDIANA, que um caso estranho não arrasta.
 */
export const getAvgPrepMinutes = (orders: OrderTimestamps[]): number | null => {
  const durations = orders
    .filter((o) => !o.scheduled_date && o.ready_at && (o.preparing_at || o.confirmed_at))
    .map((o) => (new Date(o.ready_at as string).getTime() - new Date((o.preparing_at || o.confirmed_at) as string).getTime()) / 60000)
    .filter((min) => min >= 0 && min <= 240)
    .sort((a, b) => a - b);
  if (durations.length === 0) return null;
  const meio = Math.floor(durations.length / 2);
  const mediana = durations.length % 2 ? durations[meio] : (durations[meio - 1] + durations[meio]) / 2;
  return Math.round(mediana);
};

/**
 * Pedido agendado ainda não em preparo: o relógio que importa é o HORÁRIO
 * agendado, não quanto tempo faz que o cliente pediu. Sem isso o quadro
 * pintava de vermelho "285h" um pedido marcado para amanhã.
 */
export const prazoDoAgendado = (
  order: Pick<OrderTimestamps, 'status' | 'scheduled_date' | 'scheduled_time'>,
  agora: Date = new Date(),
): { faltamMin: number; atrasadoMin: number } | null => {
  if (!order.scheduled_date) return null;
  const s = (order.status || '').toLowerCase();
  if (!['pending', 'confirmed', 'paid', 'payment_confirmed', 'processing', 'awaiting_payment'].includes(s)) return null;
  const hora = (order.scheduled_time || '00:00:00').slice(0, 8).padEnd(8, ':00');
  const alvo = new Date(`${order.scheduled_date}T${hora}-03:00`);
  const diff = Math.round((alvo.getTime() - agora.getTime()) / 60000);
  return diff >= 0 ? { faltamMin: diff, atrasadoMin: 0 } : { faltamMin: 0, atrasadoMin: -diff };
};

export interface SituacaoDoPreparo {
  /** ISO de quando o pedido deveria ficar pronto. */
  previstoPara: string;
  /** Minutos além da previsão; 0 enquanto está no prazo. */
  atrasadoMin: number;
  /** Minutos até a previsão; 0 quando já passou. */
  faltamMin: number;
}

/**
 * Previsão de pronto do pedido em preparo.
 *
 * `prep_due_at` vem do backend (preparing_at + tempo de preparo FOTOGRAFADO da
 * loja no momento em que entrou em preparo). Sem ele — loja sem tempo padrão —
 * não há previsão, e o quadro segue só com o tempo decorrido.
 */
export const situacaoDoPreparo = (
  order: { status: string; prep_due_at?: string | null },
  agora: number = Date.now(),
): SituacaoDoPreparo | null => {
  if ((order.status || '').toLowerCase() !== 'preparing' || !order.prep_due_at) return null;
  const previsto = new Date(order.prep_due_at).getTime();
  if (Number.isNaN(previsto)) return null;
  const diffMin = Math.floor((agora - previsto) / 60000);
  return {
    previstoPara: order.prep_due_at,
    atrasadoMin: Math.max(0, diffMin),
    faltamMin: Math.max(0, Math.ceil((previsto - agora) / 60000)),
  };
};
