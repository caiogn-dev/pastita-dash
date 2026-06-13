/**
 * StatCard canônico — redesign painel (identidade Pastita/Cardapidex)
 * Métrica de dashboard usando o Card canônico.
 */
import React from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';

export type StatCardTone = 'default' | 'brand' | 'warning';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: StatCardTone;
  onClick?: () => void;
  className?: string;
}

const VALUE_TONE: Record<StatCardTone, string> = {
  default: 'text-fg-token',
  brand: 'text-brand',
  warning: 'text-[var(--warning)]',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  tone = 'default',
  onClick,
  className,
}) => {
  const clickable = typeof onClick === 'function';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 transition-colors',
        clickable && 'cursor-pointer hover:bg-surface-2',
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted-token">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-extrabold tracking-tight',
          VALUE_TONE[tone]
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-fg-muted-token">{sub}</p>}
    </Card>
  );
};

StatCard.displayName = 'StatCard';

export default StatCard;
