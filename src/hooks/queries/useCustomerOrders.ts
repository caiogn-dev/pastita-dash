import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../../services/storesApi';

/**
 * Pedidos de um único cliente, filtrados server-side por telefone
 * (`/stores/orders/?store=<slug>&customer=<phone>`).
 *
 * Substitui o download de 200 pedidos da loja + filtro em JS. Só dispara
 * quando há `store` e `phone` (`enabled`), evitando o over-fetch quando o
 * cliente não tem telefone.
 */
export function useCustomerOrders(
  storeId: string | undefined | null,
  phone: string | undefined | null
) {
  return useQuery({
    queryKey: ['orders', storeId, 'customer', phone],
    queryFn: () => getOrders({ store: storeId ?? undefined, customer: phone as string }),
    enabled: !!storeId && !!phone,
  });
}
