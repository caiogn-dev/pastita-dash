/**
 * Input - Componente de input moderno com Chakra UI v3
 * Suporta props legados para compatibilidade
 */
import React from 'react';
import { Input as ChakraInput, Stack, Text } from '@chakra-ui/react';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'date';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  disabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  size = 'md',
  isDisabled = false,
  disabled = false,
  isReadOnly = false,
  isRequired = false,
  required = false,
  error,
  helperText,
  leftElement,
  rightElement,
  className,
  min,
  max,
  step,
}) => {
  const finalRequired = isRequired || required;
  const finalDisabled = isDisabled || disabled;
  
  // Converte value para string se for number
  const stringValue = value !== undefined && value !== null 
    ? String(value) 
    : '';

  return (
    <Stack gap={1.5} className={className}>
      {label && (
        <Text fontSize="sm" fontWeight="medium" color="fg.primary">
          {label}
          {finalRequired && <Text as="span" color="danger.500"> *</Text>}
        </Text>
      )}
      
      <ChakraInput
        type={type}
        placeholder={placeholder}
        value={stringValue}
        onChange={onChange}
        size={size}
        disabled={finalDisabled}
        readOnly={isReadOnly}
        min={min}
        max={max}
        step={step}
        borderColor={error ? 'danger.500' : 'border.primary'}
        _focus={{
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        }}
      />
      
      {helperText && !error && (
        <Text fontSize="xs" color="fg.muted">{helperText}</Text>
      )}
      
      {error && (
        <Text fontSize="xs" color="danger.500">{error}</Text>
      )}
    </Stack>
  );
};

export default Input;
