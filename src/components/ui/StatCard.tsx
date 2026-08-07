/**
 * StatCard canônico — redesign painel (identidade Pastita/Cardapidex)
 * Métrica de dashboard usando o Card canônico.
 */
import React from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';

export type StatCardTone = 'default' | 'brand' | 'warning' | 'success' | 'danger';

/**
 * Comparativo com o período anterior.
 *
 * `variacaoPct: null` significa SEM BASE DE COMPARAÇÃO — o período anterior foi
 * zero. Mostrar "0%" ali seria mentira: uma loja que saiu de R$ 0 para R$ 2.888
 * não teve 0% de variação (aconteceu de verdade na Pastita em ago/2026).
 */
export interface StatCardComparativo {
  variacaoPct: number | null;
  rotulo: string;
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: StatCardTone;
  comparativo?: StatCardComparativo;
  /** Explicação do indicador — vira `title` acessível no rótulo. */
  ajuda?: string;
  onClick?: () => void;
  className?: string;
}

const VALUE_TONE: Record<StatCardTone, string> = {
  default: 'text-fg-token',
  brand: 'text-brand-ink',
  warning: 'text-[var(--warning)]',
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  tone = 'default',
  comparativo,
  ajuda,
  onClick,
  className,
}) => {
  const clickable = typeof onClick === 'function';
  const pct = comparativo?.variacaoPct;
  const subiu = typeof pct === 'number' && pct > 0;
  const caiu = typeof pct === 'number' && pct < 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 transition-colors',
        clickable && 'cursor-pointer hover:bg-surface-2',
        className
      )}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide text-fg-muted-token"
        title={ajuda}
      >
        {label}
        {ajuda && <span className="ml-1 cursor-help opacity-60" aria-hidden>?</span>}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-extrabold tracking-tight',
          VALUE_TONE[tone]
        )}
      >
        {value}
      </p>
      {comparativo && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          {pct === null ? (
            // Sem período anterior não há percentual honesto a mostrar.
            <span className="text-fg-muted-token">sem base de comparação</span>
          ) : (
            <>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  subiu && 'text-[var(--success)]',
                  caiu && 'text-[var(--danger)]',
                  !subiu && !caiu && 'text-fg-muted-token'
                )}
              >
                {subiu ? '▲' : caiu ? '▼' : '='} {Math.abs(pct ?? 0).toFixed(1)}%
              </span>
              <span className="text-fg-muted-token">{comparativo.rotulo}</span>
            </>
          )}
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-fg-muted-token">{sub}</p>}
    </Card>
  );
};

StatCard.displayName = 'StatCard';

export default StatCard;
