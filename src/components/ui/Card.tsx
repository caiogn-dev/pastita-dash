/**
 * Card canônico — redesign painel (identidade Pastita/Cardapidex)
 * Superfície neutra com borda e cantos retos.
 *
 * Fonte única. Suporta superset de props:
 * - <div> puro (comportamento original) quando nenhuma prop de header/layout é passada.
 * - Header interno opcional via title/subtitle/action(s).
 * - Layout opcional via variant/size/padding/noPadding/hoverable.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'default' | 'outline' | 'filled';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título opcional — renderiza um header interno. */
  title?: string;
  /** Subtítulo opcional (sob o título no header). */
  subtitle?: string;
  /** Ação no header (botão, menu etc.). */
  action?: React.ReactNode;
  /** Alias de `action` para consumidores legados. */
  actions?: React.ReactNode;
  /** Remove o padding interno do corpo (e do header). */
  noPadding?: boolean;
  /** Tamanho do padding interno. Default 'md'. */
  size?: CardSize;
  /** Alias de `size` (compat). */
  padding?: CardSize;
  /** Variante de superfície. Default 'default'. */
  variant?: CardVariant;
  /** Aplica realce sutil ao passar o mouse. */
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-border-token',
  outline: 'bg-transparent border border-border-token',
  filled: 'bg-surface-2 border-0',
};

const paddingClasses: Record<CardSize, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const headerPaddingClasses: Record<CardSize, string> = {
  sm: 'px-3 pt-3',
  md: 'px-4 pt-4',
  lg: 'px-6 pt-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      title,
      subtitle,
      action,
      actions,
      noPadding = false,
      size,
      padding,
      variant,
      hoverable = false,
      ...props
    },
    ref
  ) => {
    const headerAction = action ?? actions;
    const hasHeader = Boolean(title || subtitle || headerAction);
    const hasLayoutProps =
      hasHeader ||
      variant !== undefined ||
      size !== undefined ||
      padding !== undefined ||
      noPadding ||
      hoverable;

    // Caminho original: <div> puro, comportamento idêntico ao Card canônico.
    if (!hasLayoutProps) {
      return (
        <div
          ref={ref}
          className={cn('bg-surface border border-border-token rounded', className)}
          {...props}
        >
          {children}
        </div>
      );
    }

    const resolvedSize: CardSize = size ?? padding ?? 'md';
    const resolvedVariant: CardVariant = variant ?? 'default';
    const bodyPad = noPadding ? '' : paddingClasses[resolvedSize];
    const headerPad = noPadding ? '' : headerPaddingClasses[resolvedSize];

    return (
      <div
        ref={ref}
        className={cn(
          'rounded',
          variantClasses[resolvedVariant],
          hoverable && 'transition-colors hover:bg-surface-2',
          className
        )}
        {...props}
      >
        {hasHeader && (
          <div
            className={cn(
              'flex items-center justify-between pb-2',
              headerPad,
              subtitle && 'border-b border-border-token'
            )}
          >
            <div className="flex flex-col gap-0.5">
              {title && (
                <h3 className="text-lg font-semibold text-fg-token">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-fg-muted-token">{subtitle}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}

        <div className={bodyPad}>{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
