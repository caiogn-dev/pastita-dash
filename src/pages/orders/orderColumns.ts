import {
  ClockIcon,
  CheckCircleIcon,
  FireIcon,
  TruckIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

// Config das colunas do kanban de pedidos — fonte única usada pela página
// e pelo drill-down dos KPIs do dashboard (?status=).
export const COLUMNS = [
  {
    id: 'pending',
    label: 'Recebido',
    description: 'Aguardando confirmação',
    statuses: ['pending', 'processing', 'awaiting_payment', 'payment_pending'],
    headerBg: 'bg-slate-600',
    borderTop: 'border-t-slate-400',
    dotColor: 'bg-slate-400',
    colBg: 'bg-slate-50/80 dark:bg-zinc-950/40',
    Icon: ClockIcon,
  },
  {
    id: 'confirmed',
    label: 'Confirmado',
    description: 'Pronto para produção',
    statuses: ['confirmed', 'paid', 'payment_confirmed'],
    headerBg: 'bg-blue-600',
    borderTop: 'border-t-blue-400',
    dotColor: 'bg-blue-400',
    colBg: 'bg-blue-50/60 dark:bg-zinc-950/40',
    Icon: CheckCircleIcon,
  },
  {
    id: 'preparing',
    label: 'Preparando',
    description: 'Em produção na cozinha',
    statuses: ['preparing'],
    headerBg: 'bg-orange-500',
    borderTop: 'border-t-orange-400',
    dotColor: 'bg-orange-400',
    colBg: 'bg-orange-50/60 dark:bg-zinc-950/40',
    Icon: FireIcon,
  },
  {
    id: 'dispatch',
    label: 'Em Entrega',
    description: 'Saiu / Pronto p/ retirada',
    statuses: ['out_for_delivery', 'ready', 'shipped'],
    headerBg: 'bg-indigo-600',
    borderTop: 'border-t-indigo-400',
    dotColor: 'bg-indigo-400',
    colBg: 'bg-indigo-50/60 dark:bg-zinc-950/40',
    Icon: TruckIcon,
  },
  {
    id: 'done',
    label: 'Entregue',
    description: 'Pedido finalizado',
    statuses: ['delivered', 'completed'],
    headerBg: 'bg-emerald-600',
    borderTop: 'border-t-emerald-400',
    dotColor: 'bg-emerald-400',
    colBg: 'bg-emerald-50/60 dark:bg-zinc-950/40',
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
