// KDS (tela de cozinha): 3 etapas de produção.
// 'pending' fica de fora — cozinha só vê pedido confirmado pelo caixa.

interface KdsOrder {
  id: string;
  status: string;
  created_at: string;
}

export const KDS_COLUMNS = [
  { id: 'todo', label: 'A iniciar', statuses: ['confirmed', 'paid', 'payment_confirmed'] },
  { id: 'preparing', label: 'Preparando', statuses: ['preparing'] },
  { id: 'ready', label: 'Pronto', statuses: ['ready'] },
] as const;

export type KdsColumnId = typeof KDS_COLUMNS[number]['id'];

export const groupKdsOrders = <T extends KdsOrder>(orders: T[]): Record<KdsColumnId, T[]> => {
  const grouped: Record<KdsColumnId, T[]> = { todo: [], preparing: [], ready: [] };
  for (const col of KDS_COLUMNS) {
    grouped[col.id] = orders
      .filter((o) => (col.statuses as readonly string[]).includes((o.status || '').toLowerCase()))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return grouped;
};
