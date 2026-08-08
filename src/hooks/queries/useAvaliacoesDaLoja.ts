/**
 * As avaliações da loja para a home.
 *
 * Hook próprio, e não `useQuery` solto dentro da página, pelo mesmo motivo dos
 * outros daqui: a home é montada em teste sem `QueryClientProvider`, e cada
 * consulta embutida no componente obriga o teste a saber da infraestrutura de
 * dados para verificar um texto na tela.
 */
import { useQuery } from '@tanstack/react-query';

import { getAnalyticsReport } from '../../services/reports';
import type { ResumoDeAvaliacoes } from '../../pages/dashboard/leituraDeAvaliacoes';

export function useAvaliacoesDaLoja(storeKey: string | null | undefined) {
  return useQuery({
    queryKey: ['avaliacoes-home', storeKey],
    queryFn: () => getAnalyticsReport<ResumoDeAvaliacoes>('reviews'),
    enabled: Boolean(storeKey),
    // Avaliação nova é rara; 5 minutos evita refazer a consulta a cada volta
    // para a home durante o expediente.
    staleTime: 5 * 60_000,
  });
}

export default useAvaliacoesDaLoja;
