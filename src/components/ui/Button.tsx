/**
 * Button canônico — fonte única (superset).
 * Identidade Pastita/Cardapidex: cantos retos (rounded), tokens de marca, sem gradientes.
 *
 * Suporta a API moderna (variant primary/outline/ghost/danger + leftIcon) e a API
 * legada de common/ (solid/secondary/link, size xs/sm/md/lg, isLoading, isDisabled,
 * rightIcon, width, mt) via aliases, sem quebrar consumidores.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Aliases legados: solid→primary, secondary→outline, link→ghost (estilo link).
export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'solid'
  | 'secondary'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'width'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  /** Largura CSS (string como '100%' ou número de px). Legado de common/. */
  width?: string | number;
  /** Margem superior em múltiplos de 0.25rem. Legado de common/. */
  mt?: number;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none';

// Variantes canônicas mantendo tokens de marca; aliases legados mapeiam para elas.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  outline: 'border border-border-token text-fg-token hover:bg-surface-2',
  ghost: 'text-fg-muted-token hover:bg-surface-2',
  danger: 'border border-[var(--danger)] text-[var(--danger)] hover:bg-red-50',
  // aliases legados
  solid: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-border-token text-fg-token hover:bg-surface-2',
  link: 'text-brand hover:underline px-0 py-0',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Spinner = () => (
  <svg
    className="animate-spin w-4 h-4 shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading = false,
      isDisabled = false,
      fullWidth = false,
      width,
      mt,
      disabled,
      style,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const isOff = disabled || isDisabled || isLoading;
    const mergedStyle: React.CSSProperties = {
      ...style,
      ...(width !== undefined ? { width } : null),
      ...(mt !== undefined ? { marginTop: `${mt * 0.25}rem` } : null),
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isOff}
        style={mergedStyle}
        className={cn(
          BASE,
          VARIANTS[variant] ?? VARIANTS.primary,
          SIZES[size] ?? SIZES.md,
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
