import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/ai';

export const aiDailySummaryQueryKey = (store: string | null | undefined) =>
  ['ai-daily-summary', store] as const;

/**
 * Resumo IA do dia anterior (`/stores/ai/daily-summary/?store=`).
 * O backend cacheia a geração; 30min de staleTime evita re-gerar à toa
 * a cada navegação de volta ao dashboard.
 */
export function useAiDailySummary(store: string | null | undefined) {
  return useQuery({
    queryKey: aiDailySummaryQueryKey(store),
    queryFn: () => aiService.getDailySummary(store as string),
    enabled: !!store,
    staleTime: 30 * 60 * 1000,
  });
}
