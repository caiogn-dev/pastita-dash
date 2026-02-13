/**
 * Skeleton Component - Modern loading placeholders with shimmer effect
 */
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rounded';
  animation?: 'pulse' | 'shimmer' | 'none';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'default',
      animation = 'shimmer',
      width,
      height,
      style,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: 'rounded-md',
      circular: 'rounded-full',
      rounded: 'rounded-xl',
    };

    const animations = {
      pulse: 'animate-pulse',
      shimmer: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 bg-[length:200%_100%]',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200 dark:bg-zinc-800',
          variants[variant],
          animations[animation],
          className
        )}
        style={{
          width,
          height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Text Skeleton
export const SkeletonText = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <Skeleton ref={ref} className={cn('h-4 w-full', className)} {...props} />
  )
);

SkeletonText.displayName = 'SkeletonText';

// Avatar Skeleton
export interface SkeletonAvatarProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="circular"
      className={cn(avatarSizes[size], className)}
      {...props}
    />
  )
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

// Card Skeleton
export const SkeletonCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6',
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
);

SkeletonCard.displayName = 'SkeletonCard';

// Table Row Skeleton
export const SkeletonTableRow = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-4 py-4 border-b border-gray-100 dark:border-zinc-800',
        className
      )}
      {...props}
    >
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  )
);

SkeletonTableRow.displayName = 'SkeletonTableRow';

// Stats Grid Skeleton
export const SkeletonStats = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}
      {...props}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
        >
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
);

SkeletonStats.displayName = 'SkeletonStats';

// Chat Message Skeleton
export const SkeletonMessage = forwardRef<HTMLDivElement, { isOwn?: boolean } & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, isOwn = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex gap-3',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      {...props}
    >
      <SkeletonAvatar size="sm" />
      <div className={cn('space-y-2', isOwn ? 'items-end' : 'items-start')}>
        <Skeleton className={cn('h-4 rounded-2xl', isOwn ? 'w-48' : 'w-56')} height={40} />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
);

SkeletonMessage.displayName = 'SkeletonMessage';

export default Skeleton;
