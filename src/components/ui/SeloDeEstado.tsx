import React from 'react';
import { Badge, BadgeTone } from './Badge';
import { cn } from '../../utils/cn';

export interface SeloDeEstadoProps {
  tone: BadgeTone;
  children: React.ReactNode;
  /** Ponto colorido antes do texto: "conectado", "online". */
  ponto?: boolean;
  className?: string;
}

const PONTO: Record<BadgeTone, string> = {
  brand: 'bg-brand',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-fg-muted-token',
};

/** Selo de estado: o `Badge` do kit com um ponto opcional. Substitui Selo,
 *  PaymentBadge e PaymentStatusBadge, cada um com sua paleta. */
export const SeloDeEstado: React.FC<SeloDeEstadoProps> = ({ tone, children, ponto = false, className }) => (
  <Badge tone={tone} className={cn('gap-1.5 rounded-pill', className)}>
    {ponto && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-pill', PONTO[tone])} />}
    {children}
  </Badge>
);
