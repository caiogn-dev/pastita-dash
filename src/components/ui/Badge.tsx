/**
 * Badge canônico — redesign painel (identidade Pastita/Cardapidex)
 * Tons semânticos via tokens, cantos retos.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const BASE = 'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-brand-soft text-brand',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-red-50 text-[var(--danger)]',
  neutral: 'bg-surface-2 text-fg-muted-token',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = 'neutral', ...props }, ref) => {
    return (
      <span ref={ref} className={cn(BASE, TONES[tone], className)} {...props} />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
