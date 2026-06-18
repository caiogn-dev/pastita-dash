/**
 * Alert Component
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-surface-2 text-fg-token border-border-token',
  destructive: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]/30',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30',
  success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/30',
  info: 'bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]/30',
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        '[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]',
        '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Alert.displayName = 'Alert';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
);

AlertDescription.displayName = 'AlertDescription';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);

AlertTitle.displayName = 'AlertTitle';

export default Alert;
