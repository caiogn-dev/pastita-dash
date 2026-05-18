/**
 * Badge - Componente de badge sem Chakra UI
 */
import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray' | 'info' | 'purple';
  variant?: 'solid' | 'subtle' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map legacy variants → Tailwind class sets
const VARIANT_CLASSES: Record<string, string> = {
  solid:   'bg-gray-700 text-white',
  subtle:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  outline: 'border border-gray-400 text-gray-700 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info:    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const COLOR_PALETTE_CLASSES: Record<string, string> = {
  brand:   'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  accent:  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  info:    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  colorPalette,
  variant = 'subtle',
  size = 'md',
  className,
}) => {
  const colorClass = colorPalette
    ? COLOR_PALETTE_CLASSES[colorPalette] ?? COLOR_PALETTE_CLASSES.gray
    : VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.subtle;

  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        colorClass,
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};

export default Badge;

// ─── Status configs (preserved for compatibility) ────────────────────────────

export const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  pending:          { label: 'Pendente',    variant: 'warning' },
  processing:       { label: 'Processando', variant: 'info'    },
  confirmed:        { label: 'Confirmado',  variant: 'success' },
  paid:             { label: 'Pago',        variant: 'success' },
  preparing:        { label: 'Preparando',  variant: 'info'    },
  ready:            { label: 'Pronto',      variant: 'success' },
  shipped:          { label: 'Enviado',     variant: 'info'    },
  out_for_delivery: { label: 'Em Entrega',  variant: 'warning' },
  delivered:        { label: 'Entregue',    variant: 'success' },
  cancelled:        { label: 'Cancelado',   variant: 'danger'  },
  refunded:         { label: 'Reembolsado', variant: 'gray'    },
  failed:           { label: 'Falhou',      variant: 'danger'  },
};

export const CONVERSATION_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  active:   { label: 'Ativa',     variant: 'success' },
  inactive: { label: 'Inativa',   variant: 'gray'    },
  archived: { label: 'Arquivada', variant: 'warning' },
  spam:     { label: 'Spam',      variant: 'danger'  },
};

export const CONVERSATION_MODE_CONFIG: Record<string, { label: string; variant: string }> = {
  auto:   { label: 'Auto',    variant: 'success' },
  human:  { label: 'Humano',  variant: 'warning' },
  hybrid: { label: 'Híbrido', variant: 'info'    },
};

export const StatusBadge: React.FC<{ status: string; children?: React.ReactNode }> = ({ status, children }) => {
  const config = ORDER_STATUS_CONFIG[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant as any}>{children || config.label}</Badge>;
};

export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = ORDER_STATUS_CONFIG[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
};

export const ConversationStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = CONVERSATION_STATUS_CONFIG[status] || { label: status, variant: 'gray' };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
};

export const ConversationModeBadge: React.FC<{ mode: string }> = ({ mode }) => {
  const config = CONVERSATION_MODE_CONFIG[mode] || { label: mode, variant: 'gray' };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
};
