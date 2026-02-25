/**
 * Badge - Componente de badge moderno com Chakra UI v3
 */
import React from 'react';
import { Badge as ChakraBadge } from '@chakra-ui/react';

export interface BadgeProps {
  children: React.ReactNode;
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray';
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  colorPalette = 'gray',
  variant = 'subtle',
  size = 'md',
  className,
}) => {
  return (
    <ChakraBadge
      colorPalette={colorPalette}
      variant={variant}
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
