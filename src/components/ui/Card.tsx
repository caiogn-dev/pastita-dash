/**
 * Card canônico — redesign painel (identidade Pastita/Cardapidex)
 * Superfície neutra com borda e cantos retos.
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('bg-surface border border-border-token rounded', className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export default Card;
