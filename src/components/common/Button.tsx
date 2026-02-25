/**
 * Button - Componente de botão moderno com Chakra UI v3
 */
import React from 'react';
import { Button as ChakraButton, Spinner } from '@chakra-ui/react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'solid' | 'outline' | 'ghost' | 'link';
  colorPalette?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  width?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  colorPalette = 'brand',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  className,
  width,
}) => {
  return (
    <ChakraButton
      variant={variant}
      colorPalette={colorPalette}
      size={size}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      type={type}
      className={className}
      width={width}
      loading={isLoading}
      loadingText="Carregando..."
    >
      {leftIcon && !isLoading && <span style={{ marginRight: '0.5rem' }}>{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span style={{ marginLeft: '0.5rem' }}>{rightIcon}</span>}
    </ChakraButton>
  );
};

export default Button;
