/**
 * Card "Resumo IA (ontem)" do dashboard.
 *
 * Mostra o resumo em linguagem natural gerado pelo backend
 * (`/stores/ai/daily-summary/`) + mini-stats do dia anterior.
 * Falha NUNCA quebra o dashboard: erro vira um EmptyState curto dentro do card.
 */
import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card } from '../ui';
import { EmptyState, Skeleton } from '../common';
import { useAiDailySummary, aiDailySummaryQueryKey } from '../../hooks/queries/useAiDailySummary';
import { aiService } from '../../services/ai';

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0,
  );

interface MiniStatProps {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, danger }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-widest text-fg-muted-token">{label}</p>
    <p className={`mt-0.5 text-sm font-bold tabular-nums truncate ${danger ? 'text-red-500 dark:text-red-400' : 'text-fg-token'}`}>
      {value}
    </p>
  </div>
);

export interface AiDailySummaryCardProps {
  /** Slug ou id da loja (backend aceita ambos). */
  store: string;
  className?: string;
}

export const AiDailySummaryCard: React.FC<AiDailySummaryCardProps> = ({ store, className }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useAiDailySummary(store);
  const [refreshing, setRefreshing] = useState(false);

  // Regenera com refresh=1 e injeta o resultado direto no cache do react-query
  // (invalidate simples repetiria a chamada SEM refresh e voltaria o cacheado).
  const handleRefresh = useCallback(async () => {
    if (!store || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await aiService.getDailySummary(store, true);
      queryClient.setQueryData(aiDailySummaryQueryKey(store), fresh);
    } catch {
      toast.error('Não foi possível atualizar o resumo IA');
    } finally {
      setRefreshing(false);
    }
  }, [store, refreshing, queryClient]);

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border-token">
        <h2 className="text-sm font-semibold text-fg-token flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-brand" aria-hidden="true" />
          ✨ Resumo IA (ontem)
        </h2>
        <div className="flex items-center gap-2">
          {data?.source === 'template' && (
            <span className="text-[10px] font-medium text-fg-muted-token bg-surface-2 border border-border-token rounded-full px-2 py-0.5">
              gerado sem IA
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            aria-label="Regenerar resumo IA"
            title="Regenerar resumo"
            className="p-1.5 rounded-lg text-fg-muted-token hover:text-fg-token hover:bg-surface-2
                       disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading || refreshing ? (
        <div className="p-5 space-y-3" aria-busy="true" aria-label="Carregando resumo IA">
          <Skeleton variant="text" height={16} width="90%" />
          <Skeleton variant="text" height={16} width="70%" />
          <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={36} />
            ))}
          </div>
        </div>
      ) : isError || !data ? (
        <EmptyState
          className="py-8"
          icon={<SparklesIcon className="w-8 h-8 text-fg-muted-token" />}
          title="Resumo IA indisponível"
          description="Não foi possível gerar o resumo de ontem. Tente novamente mais tarde."
        />
      ) : (
        <div className="p-5 space-y-4">
          <p className="text-sm leading-relaxed text-fg-token font-medium">
            {data.summary}
          </p>

          <div className="grid grid-cols-5 max-md:grid-cols-2 gap-3 pt-1 border-t border-border-token [&>*]:pt-3">
            <MiniStat label="Pedidos" value={data.stats.orders} />
            <MiniStat label="Receita" value={fmtBRL(data.stats.revenue)} />
            <MiniStat label="Ticket médio" value={fmtBRL(data.stats.avg_ticket)} />
            <MiniStat
              label="Pico"
              value={data.stats.peak_hour !== null && data.stats.peak_hour !== undefined ? `${data.stats.peak_hour}h` : '—'}
            />
            {data.stats.cancelled > 0 && (
              <MiniStat label="Cancelados" value={data.stats.cancelled} danger />
            )}
          </div>

          {data.stats.top_products?.length > 0 && (
            <p className="text-xs text-fg-muted-token">
              Top produto:{' '}
              <span className="font-semibold text-fg-token">{data.stats.top_products[0].name}</span>
              {' · '}{data.stats.top_products[0].qty}x{' · '}{fmtBRL(data.stats.top_products[0].total)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiDailySummaryCard;
