/**
 * Score da Loja — gamificação do LOJISTA na Visão Geral.
 * Anel de progresso (0-100) + nível Bronze→Diamante + as 3 próximas
 * conquistas com CTA. Cada item do checklist é uma alavanca real de venda.
 */
import React, { useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { DateRange } from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { SectionCard } from './shared';

interface ScoreItem { key: string; label: string; points: number; done: boolean; cta: string }
interface StoreScoreReport {
  score: number;
  level: 'bronze' | 'prata' | 'ouro' | 'diamante';
  checklist: ScoreItem[];
  next_up: ScoreItem[];
}

const LEVEL_META: Record<StoreScoreReport['level'], { label: string; emoji: string; color: string }> = {
  bronze: { label: 'Bronze', emoji: '🥉', color: '#cd7f32' },
  prata: { label: 'Prata', emoji: '🥈', color: '#9ca3af' },
  ouro: { label: 'Ouro', emoji: '🥇', color: 'var(--brand)' },
  diamante: { label: 'Diamante', emoji: '💎', color: '#38bdf8' },
};

const RING = 2 * Math.PI * 42;

export const StoreScoreSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<StoreScoreReport>('store-score', range, enabled);
  const [showAll, setShowAll] = useState(false);
  const d = q.data;
  const level = d ? LEVEL_META[d.level] : LEVEL_META.bronze;
  const pct = d ? d.score / 100 : 0;

  return (
    <SectionCard
      title="Score da loja"
      subtitle="Complete as conquistas — cada uma é uma alavanca comprovada de venda"
      loading={q.isLoading}
    >
      <div className="flex flex-wrap items-center gap-8">
        {/* Anel */}
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-2, #eee)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={level.color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${RING * pct} ${RING}`}
              style={{ transition: 'stroke-dasharray 600ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center rotate-0">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-fg-token leading-none">{d?.score ?? 0}</p>
              <p className="text-badge text-fg-muted-token">de 100</p>
            </div>
          </div>
        </div>

        {/* Nível + próximas conquistas */}
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-semibold text-fg-token mb-3">
            {level.emoji} Nível {level.label}
            {d?.level !== 'diamante' && (
              <span className="text-fg-muted-token font-normal"> · próximo nível a caminho</span>
            )}
          </p>
          <div className="flex flex-col gap-2.5">
            {(showAll ? d?.checklist ?? [] : d?.next_up ?? []).map((item) => (
              <div key={item.key} className="flex items-start gap-2.5">
                {item.done ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <span className="w-5 h-5 shrink-0 mt-0.5 grid place-items-center rounded-full bg-brand/15 text-brand-ink text-badge font-bold">
                    +{item.points}
                  </span>
                )}
                <div className="min-w-0">
                  <p className={`text-sm ${item.done ? 'text-fg-muted-token line-through' : 'font-medium text-fg-token'}`}>
                    {item.label}
                  </p>
                  {!item.done && <p className="text-xs text-fg-muted-token">{item.cta}</p>}
                </div>
              </div>
            ))}
          </div>
          {(d?.checklist?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline"
            >
              {showAll ? 'Mostrar só as próximas' : `Ver as ${d?.checklist.length} conquistas`}
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default StoreScoreSection;
