/**
 * Input Component — fonte única (superset)
 * Design painel Cardapidex: tokens de superfície/borda, cantos retos, foco brand.
 *
 * Suporta:
 * - InputHTMLAttributes nativos.
 * - label, error (texto + borda danger), helperText/hint.
 * - leftElement/rightElement (e aliases leftIcon/rightIcon).
 * - leftAddon/rightAddon.
 */
import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  /** Texto auxiliar (sob o input). Alias: hint. */
  helperText?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Elemento à esquerda (ícone). Alias: leftIcon. */
  leftElement?: React.ReactNode;
  /** Elemento à direita (ícone). Alias: rightIcon. */
  rightElement?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      hint,
      size = 'md',
      leftElement,
      rightElement,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const left = leftElement ?? leftIcon;
    const right = rightElement ?? rightIcon;
    const helper = helperText ?? hint;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium transition-colors duration-200',
              focused ? 'text-brand' : 'text-fg-token',
              error && 'text-danger-500'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative flex">
          {leftAddon && (
            <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-border-token bg-surface-2 text-fg-muted-token text-sm">
              {leftAddon}
            </span>
          )}

          <div className="relative flex-1">
            {left && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span
                  className={cn(
                    'text-fg-muted-token transition-colors',
                    focused && 'text-brand',
                    error && 'text-danger-500'
                  )}
                >
                  {left}
                </span>
              </div>
            )}

            <input
              ref={ref}
              id={inputId}
              disabled={disabled}
              onFocus={(e) => {
                setFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                props.onBlur?.(e);
              }}
              className={cn(
                // Base
                'w-full bg-surface',
                'border border-border-token',
                'text-fg-token placeholder-fg-muted-token',
                'transition-all duration-200 ease-out',

                // Foco
                'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand',

                // Erro
                error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',

                // Disabled
                disabled && 'opacity-60 cursor-not-allowed bg-surface-2',

                // Tamanho
                sizes[size],

                // Cantos retos (com addons)
                leftAddon ? 'rounded-l-none' : 'rounded-l',
                rightAddon ? 'rounded-r-none' : 'rounded-r',

                // Padding p/ ícones
                left && 'pl-10',
                right && 'pr-10',

                className
              )}
              {...props}
            />

            {right && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span
                  className={cn(
                    'text-fg-muted-token transition-colors',
                    focused && 'text-brand',
                    error && 'text-danger-500'
                  )}
                >
                  {right}
                </span>
              </div>
            )}
          </div>

          {rightAddon && (
            <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-border-token bg-surface-2 text-fg-muted-token text-sm">
              {rightAddon}
            </span>
          )}
        </div>

        {(error || helper) && (
          <p
            className={cn(
              'text-xs transition-colors',
              error ? 'text-danger-500' : 'text-fg-muted-token'
            )}
          >
            {error || helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input with animation
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
  loading?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, loading, ...props }, ref) => {
    const [value, setValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(value);
      }
    };

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        leftIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : value ? (
            <button
              type="button"
              onClick={() => setValue('')}
              className="cursor-pointer hover:text-fg-token"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
        placeholder="Buscar..."
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default Input;
