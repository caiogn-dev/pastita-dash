/** pt-BR labels for order statuses shown on mobile. */
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Forward transition chain for the live-orders board. The label is the CTA text.
const NEXT: Record<string, { status: string; label: string }> = {
  pending: { status: 'confirmed', label: 'Confirmar' },
  confirmed: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Marcar pronto' },
  ready: { status: 'out_for_delivery', label: 'Saiu p/ entrega' },
  out_for_delivery: { status: 'delivered', label: 'Entregue' },
};

/** Next forward transition for an order, or null when terminal. */
export function nextOrderStatus(status: string): { status: string; label: string } | null {
  return NEXT[status] ?? null;
}
