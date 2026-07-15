import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/ai';

export const conversationInsightsQueryKey = (
  store: string | null | undefined,
  days: number,
) => ['ai-conversation-insights', store, days] as const;

/**
 * Insights IA das conversas WhatsApp
 * (`/stores/ai/conversation-insights/?store=&days=`).
 */
export function useConversationInsights(store: string | null | undefined, days = 7) {
  return useQuery({
    queryKey: conversationInsightsQueryKey(store, days),
    queryFn: () => aiService.getConversationInsights(store as string, days),
    enabled: !!store,
    staleTime: 30 * 60 * 1000,
  });
}
