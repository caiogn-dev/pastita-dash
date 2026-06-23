import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCustomers } from '../../services/storesApi';

/**
 * Busca os clientes de uma loja com paginação e busca server-side.
 *
 * O backend pagina (`count`/`results`/`next`) e filtra via `?search=`
 * (email/telefone/whatsapp), portanto NÃO baixamos os 500 clientes nem
 * filtramos/paginamos em memória.
 *
 * `queryKey` inclui `storeId`, `search` e `page` para que cada combinação
 * tenha cache próprio (dedup). Use `keepPreviousData` para não piscar a
 * tabela ao trocar de página/busca.
 *
 * @param storeId  slug/id da loja (`enabled` só quando presente)
 * @param search   termo de busca já debounced pelo consumidor
 * @param page     página 1-based
 * @param pageSize tamanho da página (default 30)
 */
export function useCustomers(
  storeId: string | undefined | null,
  search: string,
  page: number,
  pageSize = 30
) {
  return useQuery({
    queryKey: ['customers', storeId, search, page, pageSize],
    queryFn: () =>
      getCustomers({
        store: storeId ?? undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      }),
    enabled: !!storeId,
    placeholderData: keepPreviousData,
  });
}
