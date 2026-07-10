import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastStyles = {
  success: {
    container: 'bg-[var(--success-soft)] border-[var(--success)]/30',
    icon: 'text-[var(--success)]',
    title: 'text-[var(--success)]',
    message: 'text-[var(--success)]',
  },
  error: {
    container: 'bg-[var(--danger-soft)] border-[var(--danger)]/30',
    icon: 'text-[var(--danger)]',
    title: 'text-[var(--danger)]',
    message: 'text-[var(--danger)]',
  },
  warning: {
    container: 'bg-[var(--warning-soft)] border-[var(--warning)]/30',
    icon: 'text-[var(--warning)]',
    title: 'text-[var(--warning)]',
    message: 'text-[var(--warning)]',
  },
  info: {
    container: 'bg-[var(--info-soft)] border-[var(--info)]/30',
    icon: 'text-[var(--info)]',
    title: 'text-[var(--info)]',
    message: 'text-[var(--info)]',
  },
};

const iconMap = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const Icon = iconMap[type];
  const styles = toastStyles[type];
  // Erros/avisos interrompem (assertivo); sucesso/info são anunciados educadamente.
  const isAssertive = type === 'error' || type === 'warning';

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg',
        'transform transition-all duration-300 ease-out animate-slide-in-right',
        styles.container
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={cn('text-sm font-medium', styles.title)}>{title}</p>
            {message && (
              <p className={cn('mt-1 text-sm', styles.message)}>{message}</p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => onClose(id)}
              className="inline-flex rounded-md text-zinc-400 hover:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast Container
export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
