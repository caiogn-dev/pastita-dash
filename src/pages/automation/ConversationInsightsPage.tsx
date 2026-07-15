/**
 * Insights de Conversas (IA) — página da seção Automação.
 *
 * Consome /stores/ai/conversation-insights/ (FAQs, reclamações, oportunidades,
 * sentimento) sobre as conversas WhatsApp da loja no período selecionado.
 */
import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui';
import { Badge, EmptyState, Skeleton, type BadgeVariant } from '../../components/common';
import { useStore } from '../../hooks/useStore';
import {
  useConversationInsights,
  conversationInsightsQueryKey,
} from '../../hooks/queries/useConversationInsights';
import { aiService } from '../../services/ai';

const PERIODS = [7, 14, 30] as const;

// Sentimento pode vir em pt ("positivo") ou en ("positive") — normaliza os dois.
const sentimentBadge = (sentiment: string): { variant: BadgeVariant; label: string } => {
  const s = (sentiment || '').toLowerCase();
  if (s.startsWith('posit')) return { variant: 'success', label: 'Positivo' };
  if (s.startsWith('negat')) return { variant: 'danger', label: 'Negativo' };
  return { variant: 'info', label: 'Neutro' };
};

interface InsightListCardProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyLabel: string;
}

const InsightListCard: React.FC<InsightListCardProps> = ({ title, icon, items, emptyLabel }) => (
  <Card>
    <div className="flex items-center gap-2 px-5 py-4 border-b border-border-token">
      {icon}
      <h2 className="text-sm font-semibold text-fg-token">{title}</h2>
    </div>
    <div className="p-5">
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted-token">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-fg-token">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </Card>
);

const PageSkeleton: React.FC = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Carregando insights">
    <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="p-5 space-y-3">
          <Skeleton variant="text" height={16} width="60%" />
          <Skeleton variant="text" height={14} />
          <Skeleton variant="text" height={14} width="85%" />
          <Skeleton variant="text" height={14} width="70%" />
        </Card>
      ))}
    </div>
    <Card className="p-5 space-y-3">
      <Skeleton variant="text" height={16} width="30%" />
      <Skeleton variant="text" height={14} width="90%" />
    </Card>
  </div>
);

export const ConversationInsightsPage: React.FC = () => {
  const { storeSlug, storeId } = useStore();
  const store = storeSlug || storeId;
  const queryClient = useQueryClient();

  const [days, setDays] = useState<number>(7);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError } = useConversationInsights(store, days);

  // refresh=1 força regeneração no backend; injeta o resultado no cache
  // (invalidate repetiria a chamada sem refresh e devolveria o cacheado).
  const handleRefresh = useCallback(async () => {
    if (!store || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await aiService.getConversationInsights(store, days, true);
      queryClient.setQueryData(conversationInsightsQueryKey(store, days), fresh);
    } catch {
      toast.error('Não foi possível atualizar os insights');
    } finally {
      setRefreshing(false);
    }
  }, [store, days, refreshing, queryClient]);

  if (!store) {
    return (
      <EmptyState
        icon={<SparklesIcon className="w-8 h-8 text-fg-muted-token" />}
        title="Selecione uma loja"
        description="Escolha uma loja no menu superior para ver os insights de conversas."
      />
    );
  }

  const insights = data?.insights;
  const sentiment = insights ? sentimentBadge(insights.sentiment) : null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg-token flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-brand" aria-hidden="true" />
            Insights de Conversas (IA)
          </h1>
          <p className="text-sm text-fg-muted-token mt-1">
            {isLoading
              ? 'Analisando conversas…'
              : data
                ? `${data.message_count} mensage${data.message_count === 1 ? 'm analisada' : 'ns analisadas'} nos últimos ${data.days} dias`
                : 'Análise das conversas do WhatsApp'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          <div role="group" aria-label="Período de análise" className="flex rounded-lg border border-border-token overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                aria-pressed={days === p}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  days === p
                    ? 'bg-brand text-white'
                    : 'bg-surface text-fg-muted-token hover:bg-surface-2 hover:text-fg-token'
                }`}
              >
                {p} dias
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            aria-label="Regenerar insights"
            title="Regenerar insights"
            className="p-2 rounded-lg border border-border-token text-fg-muted-token
                       hover:text-fg-token hover:bg-surface-2 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {isLoading || refreshing ? (
        <PageSkeleton />
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<ExclamationTriangleIcon className="w-8 h-8 text-fg-muted-token" />}
            title="IA indisponível, tente novamente"
            description="Não foi possível carregar os insights agora."
            action={{ label: 'Tentar novamente', onClick: handleRefresh }}
          />
        </Card>
      ) : !data || data.source === 'none' ? (
        <Card>
          <EmptyState
            icon={<ChatBubbleLeftRightIcon className="w-8 h-8 text-fg-muted-token" />}
            title="Sem mensagens no período"
            description={`Nenhuma conversa encontrada nos últimos ${days} dias para analisar.`}
          />
        </Card>
      ) : data.source === 'error' || !insights ? (
        <Card>
          <EmptyState
            icon={<ExclamationTriangleIcon className="w-8 h-8 text-fg-muted-token" />}
            title="IA indisponível, tente novamente"
            description="A análise falhou no servidor. Tente regenerar em instantes."
            action={{ label: 'Tentar novamente', onClick: handleRefresh }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-4">
            <InsightListCard
              title="❓ Perguntas frequentes"
              icon={<QuestionMarkCircleIcon className="h-4 w-4 text-blue-400" aria-hidden="true" />}
              items={insights.faqs || []}
              emptyLabel="Nenhuma pergunta recorrente identificada."
            />
            <InsightListCard
              title="⚠️ Reclamações"
              icon={<ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
              items={insights.complaints || []}
              emptyLabel="Nenhuma reclamação identificada. 🎉"
            />
            <InsightListCard
              title="💡 Oportunidades"
              icon={<LightBulbIcon className="h-4 w-4 text-brand" aria-hidden="true" />}
              items={insights.opportunities || []}
              emptyLabel="Nenhuma oportunidade identificada."
            />
          </div>

          {/* Sentimento + resumo */}
          <Card>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border-token">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-brand" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-fg-token">Sentimento geral</h2>
              {sentiment && <Badge variant={sentiment.variant}>{sentiment.label}</Badge>}
              {data.cached && (
                <span className="ml-auto text-[10px] text-fg-muted-token bg-surface-2 border border-border-token rounded-full px-2 py-0.5">
                  em cache
                </span>
              )}
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-fg-token">
                {insights.summary || data.summary}
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ConversationInsightsPage;
