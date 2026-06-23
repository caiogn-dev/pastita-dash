import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ordersService } from '../../services/orders';

/**
 * Lista paginada de pedidos para a PaymentsPage, com filtro por
 * `payment_status` server-side.
 *
 * O backend pagina (`count`/`results`/`next`) e filtra via `?payment_status=`,
 * portanto NÃO baixamos os 500 pedidos nem filtramos/paginamos em memória.
 *
 * `queryKey` inclui `storeId`, `page` e `statusFilter` para que cada combinação
 * tenha cache próprio (dedup). `keepPreviousData` evita piscar a tabela ao
 * trocar de página/filtro.
 *
 * @param storeId      slug/id da loja (`enabled` só quando presente)
 * @param page         página 1-based
 * @param statusFilter payment_status selecionado (ou null para todos)
 */
export function usePaymentsOrders(
  storeId: string | undefined | null,
  page: number,
  statusFilter: string | null
) {
  return useQuery({
    queryKey: ['orders', 'payments', storeId, page, statusFilter],
    queryFn: () =>
      ordersService.getOrders({
        store: storeId ?? undefined,
        ordering: '-created_at',
        page,
        ...(statusFilter ? { payment_status: statusFilter } : {}),
      }),
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
}
