/**
 * Quando o sino do balcão para (28/10): quando ninguém mais precisa aceitar.
 * Pedido em "Recebido" precisa; aceito, em preparo, cancelado, não. PIX ainda
 * não pago também não — o cliente nem pagou, e o sino tocaria dez minutos
 * por um carrinho abandonado. Quando o PIX cai, o `order.paid` religa.
 */
import { COLUMNS } from '../pages/orders/orderColumns';

const RECEBIDO = new Set<string>(COLUMNS.find((c) => c.id === 'pending')?.statuses ?? []);

type PedidoDoAlarme = { id: string; status?: string; payment_method?: string; payment_status?: string };

export function precisaDeAceite(p: PedidoDoAlarme): boolean {
  if (!RECEBIDO.has(p.status ?? '')) return false;
  if (p.payment_method === 'pix' && p.payment_status !== 'paid') return false;
  return true;
}

/** Os ids que ainda pedem aceite. O que não chegou na lista continua — está chegando. */
export function aindaAguardando(ids: Set<string>, pedidos: PedidoDoAlarme[]): Set<string> {
  const porId = new Map(pedidos.map((p) => [p.id, p]));
  const fica = new Set<string>();
  ids.forEach((id) => {
    const p = porId.get(id);
    if (!p || precisaDeAceite(p)) fica.add(id);
  });
  return fica;
}
