/**
 * Badge - Componente de badge moderno com Chakra UI v3
 * Suporta variants e colorPalettes legados para compatibilidade
 */
import React from 'react';
import { Badge as ChakraBadge } from '@chakra-ui/react';

export interface BadgeProps {
  children: React.ReactNode;
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray' | 'info' | 'purple';
  variant?: 'solid' | 'subtle' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Mapeia variants legados para novos
const variantMap: Record<string, 'solid' | 'subtle' | 'outline'> = {
  solid: 'solid',
  subtle: 'subtle',
  outline: 'outline',
  success: 'subtle',
  warning: 'subtle',
  danger: 'subtle',
  info: 'subtle',
  gray: 'subtle',
  purple: 'subtle',
};

// Mapeia variants legados para colorPalettes
const colorPaletteMap: Record<string, 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray' | 'info' | 'purple'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'accent',
  gray: 'gray',
  purple: 'accent',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  colorPalette,
  variant = 'subtle',
  size = 'md',
  className,
}) => {
  // Mapeia variant legado
  const mappedVariant = variantMap[variant] || 'subtle';
  
  // Determina colorPalette baseado no variant legado se não especificado
  const finalColorPalette = colorPalette || colorPaletteMap[variant] || 'gray';

  return (
    <ChakraBadge
      colorPalette={finalColorPalette}
      variant={mappedVariant}
      size={size}
      className={className}
      borderRadius="full"
      px={2}
      py={0.5}
    >
      {children}
    </ChakraBadge>
  );
};

// Configurações de status para compatibilidade
export const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  processing: { label: 'Processando', variant: 'info' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  paid: { label: 'Pago', variant: 'success' },
  preparing: { label: 'Preparando', variant: 'info' },
  ready: { label: 'Pronto', variant: 'success' },
  shipped: { label: 'Enviado', variant: 'info' },
  out_for_delivery: { label: 'Em Entrega', variant: 'warning' },
  delivered: { label: 'Entregue', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  refunded: { label: 'Reembolsado', variant: 'gray' },
  failed: { label: 'Falhou', variant: 'danger' },
};

export const CONVERSATION_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'gray' },
  archived: { label: 'Arquivada', variant: 'warning' },
  spam: { label: 'Spam', variant: 'danger' },
};

export const CONVERSATION_MODE_CONFIG: Record<string, { label: string; variant: string }> = {
  auto: { label: 'Auto', variant: 'success' },
  human: { label: 'Humano', variant: 'warning' },
  hybrid: { label: 'Híbrido', variant: 'info' },
};

// Componentes de badge específicos para compatibilidade
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

export default Badge;
