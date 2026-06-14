/**
 * Button canônico — redesign painel (identidade Pastita/Cardapidex)
 * Cantos retos (rounded), tokens de marca, sem gradientes.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: React.ReactNode;
}

const BASE =
  'inline-flex items-center gap-2 rounded px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  outline: 'border border-border-token text-fg-token hover:bg-surface-2',
  ghost: 'text-fg-muted-token hover:bg-surface-2',
  danger: 'border border-[var(--danger)] text-[var(--danger)] hover:bg-red-50',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', leftIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(BASE, VARIANTS[variant], className)}
        {...props}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
