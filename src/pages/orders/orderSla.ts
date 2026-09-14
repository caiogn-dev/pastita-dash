// SLA de preparo: o tempo exibido no card conta a partir da etapa atual,
// não da criação do pedido — e o painel mostra a média confirmado→pronto.

interface OrderTimestamps {
  status: string;
  created_at: string;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
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

/** Média (min) de confirmado→pronto dos pedidos com ambos timestamps; null sem dados. */
export const getAvgPrepMinutes = (orders: OrderTimestamps[]): number | null => {
  const durations = orders
    .filter((o) => o.confirmed_at && o.ready_at)
    .map((o) => (new Date(o.ready_at as string).getTime() - new Date(o.confirmed_at as string).getTime()) / 60000)
    .filter((min) => min >= 0);

  if (durations.length === 0) return null;
  return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
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
