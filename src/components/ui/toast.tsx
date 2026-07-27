/**
 * Toast Component - Modern notification toast with progress bar
 * Design inspired by Linear, Vercel, and Raycast
 */
import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  showProgress?: boolean;
  onClose?: (id: string) => void;
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const variants = {
  success: {
    container: 'border-[var(--success)]/30 bg-[var(--success-soft)]',
    icon: 'text-[var(--success)]',
    progress: 'bg-[var(--success)]',
    title: 'text-[var(--success)]',
    description: 'text-[var(--success)]',
  },
  error: {
    container: 'border-[var(--danger)]/30 bg-[var(--danger-soft)]',
    icon: 'text-[var(--danger)]',
    progress: 'bg-[var(--danger)]',
    title: 'text-[var(--danger)]',
    description: 'text-[var(--danger)]',
  },
  warning: {
    container: 'border-[var(--warning)]/30 bg-[var(--warning-soft)]',
    icon: 'text-[var(--warning)]',
    progress: 'bg-[var(--warning)]',
    title: 'text-[var(--warning)]',
    description: 'text-[var(--warning)]',
  },
  info: {
    container: 'border-[var(--info)]/30 bg-[var(--info-soft)]',
    icon: 'text-[var(--info)]',
    progress: 'bg-[var(--info)]',
    title: 'text-[var(--info)]',
    description: 'text-[var(--info)]',
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  description,
  duration = 5000,
  showProgress = true,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);

  const Icon = icons[variant];
  const styles = variants[variant];

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    if (duration > 0 && showProgress) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [duration, showProgress]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.(id);
    }, 200);
  };

  return (
    <div
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-xl border shadow-lg',
        'min-w-[320px] max-w-[420px]',
        'transition-all duration-200 ease-out',
        // Animation
        isVisible
          ? 'opacity-100 translate-x-0 scale-100'
          : 'opacity-0 translate-x-4 scale-95',
        // Variant
        styles.container
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={cn('shrink-0 mt-0.5', styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold text-sm', styles.title)}>
            {title}
          </p>
          {description && (
            <p className={cn('mt-1 text-sm', styles.description)}>
              {description}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Fechar notificação"
          className={cn(
            'shrink-0 p-1 rounded-lg',
            'hover:bg-black/5 dark:hover:bg-white/5',
            'transition-colors duration-150',
            styles.icon
          )}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {showProgress && duration > 0 && (
        <div className="h-1 w-full bg-black/5 dark:bg-white/5">
          <div
            className={cn(
              'h-full transition-all duration-50 ease-linear',
              styles.progress
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container Component
export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  children: React.ReactNode;
}

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  children,
}) => {
  return (
    <div
      className={cn(
        'fixed z-[9999] flex flex-col gap-3',
        positionStyles[position]
      )}
    >
      {children}
    </div>
  );
};

export default Toast;
