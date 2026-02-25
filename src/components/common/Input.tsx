/**
 * Input - Componente de input moderno com Chakra UI v3
 */
import React from 'react';
import { Input as ChakraInput, Stack, Text } from '@chakra-ui/react';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  size = 'md',
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  error,
  helperText,
  leftElement,
  rightElement,
  className,
}) => {
  return (
    <Stack gap={1.5} className={className}>
      {label && (
        <Text fontSize="sm" fontWeight="medium" color="fg.primary">
          {label}
          {isRequired && <Text as="span" color="danger.500"> *</Text>}
        </Text>
      )}
      
      <ChakraInput
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        size={size}
        disabled={isDisabled}
        readOnly={isReadOnly}
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
