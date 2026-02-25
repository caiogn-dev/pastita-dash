/**
 * Card - Componente de cartão moderno com Chakra UI v3
 * Suporta props legados para compatibilidade
 */
import React from 'react';
import { Box, Stack } from '@chakra-ui/react';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  actions,
  noPadding = false,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const variants = {
    default: {
      bg: 'bg.card',
      borderWidth: '1px',
      borderColor: 'border.primary',
    },
    outline: {
      bg: 'transparent',
      borderWidth: '1px',
      borderColor: 'border.primary',
    },
    filled: {
      bg: 'bg.secondary',
      borderWidth: '0',
    },
  };

  const sizes = {
    sm: { p: noPadding ? 0 : 3, gap: 2 },
    md: { p: noPadding ? 0 : 4, gap: 3 },
    lg: { p: noPadding ? 0 : 6, gap: 4 },
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];
  const headerAction = action || actions;

  return (
    <Box
      className={className}
      borderRadius="lg"
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ boxShadow: 'md' }}
      {...currentVariant}
    >
      {(title || subtitle || headerAction) && (
        <Stack
          direction="row"
          justify="space-between"
          align="center"
          px={currentSize.p}
          pt={currentSize.p}
          pb={subtitle ? 2 : currentSize.p}
          borderBottomWidth={subtitle ? '1px' : '0'}
          borderColor="border.subtle"
        >
            <Stack gap={0.5}>
              {title && (
                <Box
                  as="h3"
                  fontSize="lg"
                  fontWeight="semibold"
                  color="fg.primary"
                >
                  {title}
                </Box>
              )}
              {subtitle && (
                <Box
                  fontSize="sm"
                  color="fg.muted"
                >
                  {subtitle}
                </Box>
              )}
            </Stack>
            {headerAction && <Box>{headerAction}</Box>}
        </Stack>
      )}
      
      <Box p={noPadding ? 0 : currentSize.p}>
        {children}
      </Box>
    </Box>
  );
};

export default Card;
