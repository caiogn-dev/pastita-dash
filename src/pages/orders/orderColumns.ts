import {
  ClockIcon,
  CheckCircleIcon,
  FireIcon,
  TruckIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

// Config das colunas do kanban de pedidos — fonte única usada pela página
// e pelo drill-down dos KPIs do dashboard (?status=).
// Sem cor aqui: o tom de cada coluna vem de `estadoDePedido` (ui/estados.ts),
// o mesmo mapa que pinta o status do pedido no resto do painel.
export const COLUMNS = [
  {
    id: 'pending',
    label: 'Recebido',
    description: 'Aguardando confirmação',
    statuses: ['pending', 'processing', 'awaiting_payment', 'payment_pending'],
    Icon: ClockIcon,
  },
  {
    id: 'confirmed',
    label: 'Confirmado',
    description: 'Pronto para produção',
    statuses: ['confirmed', 'paid', 'payment_confirmed'],
    Icon: CheckCircleIcon,
  },
  {
    id: 'preparing',
    label: 'Preparando',
    description: 'Em produção na cozinha',
    statuses: ['preparing'],
    Icon: FireIcon,
  },
  {
    id: 'dispatch',
    label: 'Em entrega',
    description: 'Saiu ou pronto para retirada',
    statuses: ['out_for_delivery', 'ready', 'shipped'],
    Icon: TruckIcon,
  },
  {
    id: 'done',
    label: 'Entregue',
    description: 'Pedido finalizado',
    statuses: ['delivered', 'completed'],
    Icon: HomeIcon,
  },
] as const;

export type ColumnId = typeof COLUMNS[number]['id'];

export const statusToColumn = (status: string): ColumnId => {
  const s = status.toLowerCase();
  for (const col of COLUMNS) {
    if ((col.statuses as readonly string[]).includes(s)) return col.id;
  }
  return 'pending';
};

/** Resolve o ?status= do drill-down: aceita status cru ou id de coluna; null = sem filtro. */
export const resolveFocusColumn = (statusParam: string | null): ColumnId | null => {
  if (!statusParam) return null;
  const s = statusParam.toLowerCase();
  const byId = COLUMNS.find((c) => c.id === s);
  if (byId) return byId.id;
  const byStatus = COLUMNS.find((c) => (c.statuses as readonly string[]).includes(s));
  return byStatus ? byStatus.id : null;
};
