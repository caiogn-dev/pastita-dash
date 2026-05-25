/**
 * Card - Componente de cartão sem Chakra UI
 */
import React from 'react';

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

const variantClasses = {
  default: 'bg-bg-card border border-border-primary',
  outline: 'bg-transparent border border-border-primary',
  filled: 'bg-bg-secondary border-0',
};

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const headerPaddingClasses = {
  sm: 'px-3 pt-3',
  md: 'px-4 pt-4',
  lg: 'px-6 pt-6',
};

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
  const headerAction = action || actions;
  const pad = noPadding ? '' : paddingClasses[size];
  const hPad = noPadding ? '' : headerPaddingClasses[size];

  return (
    <div
      className={[
        'rounded-lg shadow-sm transition-shadow hover:shadow-md',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || subtitle || headerAction) && (
        <div
          className={`flex items-center justify-between ${hPad} pb-2 ${
            subtitle ? 'border-b border-border-subtle' : ''
          }`}
        >
          <div className="flex flex-col gap-0.5">
            {title && (
              <h3 className="text-lg font-semibold text-fg-primary">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-fg-muted">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={pad}>{children}</div>
    </div>
  );
};

export default Card;
