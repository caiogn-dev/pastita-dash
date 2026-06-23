import { useQuery } from '@tanstack/react-query';
import { getCustomerStats } from '../../services/storesApi';

/**
 * KPIs agregados de clientes calculados pelo backend
 * (`/stores/customers/stats/?store=`): `{ total, active, with_orders, total_revenue }`.
 *
 * Substitui o `reduce`/`filter` em JS sobre uma página inteira de clientes —
 * os números agora vêm prontos do servidor.
 */
export function useCustomerStats(storeId: string | undefined | null) {
  return useQuery({
    queryKey: ['customer-stats', storeId],
    queryFn: () => getCustomerStats({ store: storeId as string }),
    enabled: !!storeId,
  });
}
