/**
 * Input - Componente de input sem Chakra UI
 */
import React from 'react';

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

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

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
  className,
  min,
  max,
  step,
}) => {
  const finalRequired = isRequired || required;
  const finalDisabled = isDisabled || disabled;
  const stringValue = value !== undefined && value !== null ? String(value) : '';

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      {label && (
        <label className="text-sm font-medium text-fg-primary">
          {label}
          {finalRequired && <span className="text-danger-500 ml-0.5"> *</span>}
        </label>
      )}

      <input
        type={type}
        placeholder={placeholder}
        value={stringValue}
        onChange={onChange}
        disabled={finalDisabled}
        readOnly={isReadOnly}
        required={finalRequired}
        min={min}
        max={max}
        step={step}
        className={[
          'w-full rounded-md border bg-bg-card text-fg-primary placeholder-fg-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          error ? 'border-danger-500' : 'border-border-primary',
        ].join(' ')}
      />

      {helperText && !error && (
        <p className="text-xs text-fg-muted">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-danger-500">{error}</p>
      )}
    </div>
  );
};

export default Input;
