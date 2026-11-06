import type { ChannelRow } from '../../../services/reports';
import { formatBRL } from './shared';

const CHANNEL_LABELS: Record<string, string> = {
  web: 'Cardápio Web', bot: 'Bot WhatsApp', pdv: 'PDV/Balcão', '99food': '99Food', ifood: 'iFood',
};

/** Linha do card "Por canal". App de entrega: venda de cardápio + o que caiu na conta (extrato). */
export function linhaDoCanal(r: ChannelRow): { label: string; sub: string; value: number } {
  let sub = `${r.orders} pedidos · ticket ${formatBRL(r.avg_ticket)}`;
  if (r.conciliados) {
    const parcial = r.conciliados < r.orders ? ` (${r.conciliados} de ${r.orders})` : '';
    sub += ` · recebido ${formatBRL(r.recebido ?? 0)}${parcial}`;
  }
  return { label: CHANNEL_LABELS[r.channel] || r.channel, sub, value: r.revenue };
}
