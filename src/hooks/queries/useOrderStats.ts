import { useQuery } from '@tanstack/react-query';
import { getOrderStatsRaw } from '../../services/storesApi';

/**
 * KPIs agregados de pedidos calculados pelo backend
 * (`/stores/orders/stats/?store=`):
 * `{ total, today, this_week, this_month, by_status: {<status>: count}, revenue: { total, today, week } }`.
 *
 * `revenue.total`/`revenue.today` somam apenas pedidos com `payment_status='paid'`.
 * `by_status` é contado por STATUS do pedido (não payment_status).
 *
 * Substitui o `reduce`/`filter` em JS sobre 500 pedidos baixados —
 * os números agora vêm prontos do servidor.
 */
export function useOrderStats(storeId: string | undefined | null) {
  return useQuery({
    queryKey: ['order-stats', storeId],
    queryFn: () => getOrderStatsRaw({ store: storeId as string }),
    enabled: !!storeId,
  });
}
