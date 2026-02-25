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

export default Badge;
