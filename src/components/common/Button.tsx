/**
 * Button - Componente de botão moderno com Chakra UI v3
 * Suporta variants legados para compatibilidade
 */
import React from 'react';
import { Button as ChakraButton } from '@chakra-ui/react';

export interface ButtonProps {
  children: React.ReactNode;
  /** Variant do botão - suporta valores legados para compatibilidade */
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'primary' | 'secondary' | 'danger';
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  width?: string;
  mt?: number;
  title?: string;
}

// Mapeia variants legados para novos (Chakra v3 não tem 'link')
const variantMap: Record<string, 'solid' | 'outline' | 'ghost' | 'plain'> = {
  solid: 'solid',
  outline: 'outline',
  ghost: 'ghost',
  link: 'plain',  // 'link' vira 'plain' no Chakra v3
  primary: 'solid',
  secondary: 'outline',
  danger: 'solid',
};

const colorPaletteMap: Record<string, 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray'> = {
  primary: 'brand',
  secondary: 'gray',
  danger: 'danger',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  colorPalette,
  size = 'md',
  isLoading = false,
  isDisabled = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className,
  width,
  mt,
  title,
}) => {
  // Mapeia variant legado para novo
  const mappedVariant = variantMap[variant] || 'solid';
  
  // Determina colorPalette baseado no variant legado se não especificado
  const finalColorPalette = colorPalette || colorPaletteMap[variant] || 'brand';

  return (
    <ChakraButton
      variant={mappedVariant}
      colorPalette={finalColorPalette}
      size={size}
      disabled={isDisabled || disabled || isLoading}
      onClick={onClick}
      type={type}
      className={className}
      width={width}
      loading={isLoading}
      loadingText="Carregando..."
      mt={mt}
      title={title}
    >
      {leftIcon && !isLoading && <span style={{ marginRight: '0.5rem' }}>{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span style={{ marginLeft: '0.5rem' }}>{rightIcon}</span>}
    </ChakraButton>
  );
};

export default Button;
