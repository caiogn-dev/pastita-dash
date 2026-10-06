import { proximaAcaoDoPedido } from '../orders/proximaAcao';
import type { Order } from '../../types';

// KDS (tela de cozinha): 3 etapas de produção.
// 'pending' fica de fora — cozinha só vê pedido confirmado pelo caixa.

interface KdsOrder {
  id: string;
  status: string;
  created_at: string;
}

export const KDS_COLUMNS = [
  { id: 'todo', label: 'A iniciar', statuses: ['confirmed', 'paid'] },
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

export interface PassoDoKds { status: string; label: string }

/**
 * O botão de cada cartão. Cozinha tem dois passos próprios (iniciar, pronto);
 * do pronto em diante vale a regra única de `proximaAcao` — retirada vira
 * "Retirado", não "Saiu para entrega" (3 de 44 retiradas da Cê, 05/10).
 */
export const proximoPassoDoKds = (coluna: string, metodoDeEntrega?: string | null): PassoDoKds | null => {
  if (coluna === 'todo') return { status: 'preparing', label: 'Iniciar preparo' };
  if (coluna === 'preparing') return { status: 'ready', label: 'Pronto!' };
  if (coluna === 'ready') {
    const acao = proximaAcaoDoPedido({ status: 'ready', delivery_method: metodoDeEntrega } as unknown as Order);
    return acao && { status: acao.status, label: acao.rotulo.replace(/\s*✓$/, '') };
  }
  return null;
};
