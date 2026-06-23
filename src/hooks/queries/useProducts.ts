import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../services/storesApi';

/**
 * Busca os produtos de uma loja via react-query.
 * Cacheia por `storeId` (dedup + sem refetch ao renavegar dentro do staleTime).
 * Retorna o `PaginatedResponse<StoreProduct>` cru — o consumidor extrai `.results`.
 */
export function useProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProducts({ store: storeId, page_size: 500 }),
    enabled: !!storeId,
  });
}
