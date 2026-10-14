/**
 * Badge canônico — fonte única (superset).
 * Identidade Pastita/Cardapidex: tons semânticos via tokens, cantos retos (rounded).
 *
 * Suporta a API moderna (`tone`) e a API legada de common/ (`variant`, `colorPalette`,
 * `size`) + helpers de status (StatusBadge etc.), sem quebrar consumidores.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { estadoDePedido } from './estados';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Variantes/paletas legadas suportadas pelos consumidores de common/.
export type BadgeVariant =
  | 'solid'
  | 'subtle'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gray'
  | 'purple';

export type BadgeColorPalette =
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gray'
  | 'info'
  | 'purple';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  colorPalette?: BadgeColorPalette;
  size?: BadgeSize;
}

const BASE = 'inline-flex items-center rounded font-semibold';

const TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  info: 'bg-[var(--info-soft)] text-[var(--info)]',
  neutral: 'bg-surface-2 text-fg-muted-token',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

// Variantes legadas → tons de token canônicos.
const VARIANT_TONE: Record<BadgeVariant, BadgeTone> = {
  solid: 'neutral',
  subtle: 'neutral',
  outline: 'neutral',
  gray: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  purple: 'neutral',
};

// Paletas legadas → tons de token canônicos.
const PALETTE_TONE: Record<BadgeColorPalette, BadgeTone> = {
  brand: 'brand',
  accent: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  gray: 'neutral',
  info: 'info',
  purple: 'neutral',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, variant, colorPalette, size = 'md', ...props }, ref) => {
    const resolvedTone: BadgeTone =
      tone ??
      (colorPalette ? PALETTE_TONE[colorPalette] : undefined) ??
      (variant ? VARIANT_TONE[variant] : undefined) ??
      'neutral';

    return (
      <span
        ref={ref}
        className={cn(BASE, TONES[resolvedTone], SIZES[size] ?? SIZES.md, className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;

// ─── Status configs + helpers (preservados de common/ para compatibilidade) ───

type StatusConfig = { label: string; variant: BadgeVariant };


export const CONVERSATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'gray' },
  archived: { label: 'Arquivada', variant: 'warning' },
  spam: { label: 'Spam', variant: 'danger' },
};

export const CONVERSATION_MODE_CONFIG: Record<string, StatusConfig> = {
  auto: { label: 'Auto', variant: 'success' },
  human: { label: 'Humano', variant: 'warning' },
  hybrid: { label: 'Híbrido', variant: 'info' },
};

// Status do pedido: texto e cor vêm de `estados.ts` (que lê `rotulosDeEstado`).
// O mapa próprio que morava aqui divergia das outras telas.
export const StatusBadge: React.FC<{ status: string; children?: React.ReactNode }> = ({
  status,
  children,
}) => {
  const estado = estadoDePedido(status);
  return <Badge tone={estado.tone}>{children || estado.rotulo}</Badge>;
};

export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const estado = estadoDePedido(status);
  return <Badge tone={estado.tone}>{estado.rotulo}</Badge>;
};

export const ConversationStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: StatusConfig = CONVERSATION_STATUS_CONFIG[status] ?? {
    label: status,
    variant: 'gray',
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const ConversationModeBadge: React.FC<{ mode: string }> = ({ mode }) => {
  const config: StatusConfig = CONVERSATION_MODE_CONFIG[mode] ?? { label: mode, variant: 'gray' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
