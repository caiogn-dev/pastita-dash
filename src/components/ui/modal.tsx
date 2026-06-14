/**
 * Modal Component - Canonical single source of truth.
 *
 * Supports two usage styles, both retro-compatible:
 *  1. Simple (most consumers): pass `isOpen`/`open` + `title` + raw children.
 *     Renders a padded panel with a built-in title header and close button.
 *  2. Composed: pass children built from ModalHeader/ModalBody/ModalFooter
 *     (used by ui/dialog.tsx) — the panel stays bare and children control layout.
 *
 * Accessibility: closes on Escape and overlay click, locks body scroll while open.
 * `isOpen` is an alias for `open` (legacy headlessui API) — both work.
 */
import React, { forwardRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export interface ModalProps {
  /** Preferred prop. Alias: `isOpen`. */
  open?: boolean;
  /** Legacy alias for `open` (headlessui-era API). */
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** When provided, renders a built-in title header + padded body wrapper. */
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      isOpen,
      onClose,
      children,
      className,
      title,
      size = 'md',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
    },
    ref
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const isVisible = open ?? isOpen ?? false;

    // Handle escape key + body scroll lock
    useEffect(() => {
      if (!closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      if (isVisible) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [isVisible, onClose, closeOnEscape]);

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === overlayRef.current) {
        onClose();
      }
    };

    if (!isVisible) return null;

    // Simple path: title provided -> render built-in header + padded body.
    const hasBuiltInChrome = title !== undefined;

    return createPortal(
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center p-4',
          'bg-black/60 backdrop-blur-sm',
          'animate-fade-in'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={ref}
          className={cn(
            'relative w-full',
            'bg-surface',
            'rounded shadow-2xl',
            'border border-border-token',
            'animate-scale-in',
            'max-h-[90vh] overflow-hidden flex flex-col',
            sizes[size],
            className
          )}
        >
          {hasBuiltInChrome ? (
            <>
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
                  {title ? (
                    <h2 className="text-lg font-semibold text-fg-token pr-8">{title}</h2>
                  ) : (
                    <span />
                  )}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'p-2 rounded',
                        'text-fg-muted-token hover:text-fg-token',
                        'hover:bg-bg-token transition-colors'
                      )}
                      aria-label="Fechar"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
            </>
          ) : (
            <>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'absolute top-4 right-4 z-10',
                    'p-2 rounded',
                    'text-fg-muted-token hover:text-fg-token',
                    'hover:bg-bg-token transition-colors'
                  )}
                  aria-label="Fechar"
                >
                  <CloseIcon />
                </button>
              )}
              {children}
            </>
          )}
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

// Modal Header
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, title, subtitle, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-border-token', className)}
      {...props}
    >
      {(title || subtitle) && (
        <div className="pr-8">
          {title && (
            <h2 className="text-lg font-semibold text-fg-token">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-fg-muted-token mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
);

ModalHeader.displayName = 'ModalHeader';

// Modal Body
export const ModalBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto px-6 py-4', className)}
      {...props}
    />
  )
);

ModalBody.displayName = 'ModalBody';

// Modal Footer
export const ModalFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-3',
        'px-6 py-4 border-t border-border-token',
        'bg-bg-token',
        className
      )}
      {...props}
    />
  )
);

ModalFooter.displayName = 'ModalFooter';

// Confirm Modal
export interface ConfirmModalProps {
  open?: boolean;
  /** Legacy alias for `open`. */
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Body text. Alias: `description`. */
  message?: string;
  /** Legacy alias for `message`. */
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'default';
  /** Loading state. Alias: `loading`. */
  isLoading?: boolean;
  /** Legacy alias for `isLoading`. */
  loading?: boolean;
  icon?: React.ReactNode;
  size?: ModalProps['size'];
}

const variantStyles = {
  danger: {
    icon: 'text-error-500 bg-error-100 dark:bg-error-900/30',
    button: 'bg-error-600 hover:bg-error-700 text-white',
  },
  warning: {
    icon: 'text-warning-500 bg-warning-100 dark:bg-warning-900/30',
    button: 'bg-warning-600 hover:bg-warning-700 text-white',
  },
  info: {
    icon: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
    button: 'bg-primary-600 hover:bg-primary-700 text-white',
  },
  default: {
    icon: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
    button: 'bg-primary-600 hover:bg-primary-700 text-white',
  },
};

export const ConfirmModal = forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      open,
      isOpen,
      title,
      message,
      description,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      variant = 'danger',
      isLoading,
      loading,
      onConfirm,
      onClose,
      icon,
      size = 'sm',
    },
    ref
  ) => {
    const styles = variantStyles[variant] ?? variantStyles.default;
    const busy = isLoading ?? loading ?? false;
    const body = message ?? description;

    const defaultIcon = variant === 'danger' ? (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ) : variant === 'warning' ? (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );

    return (
      <Modal
        ref={ref}
        open={open}
        isOpen={isOpen}
        onClose={onClose}
        size={size}
        showCloseButton={false}
      >
        <div className="p-6 text-center">
          <div className={cn('inline-flex p-3 rounded-full mb-4', styles.icon)}>
            {icon || defaultIcon}
          </div>
          <h3 className="text-lg font-semibold text-fg-token mb-2">{title}</h3>
          {body && <p className="text-sm text-fg-muted-token mb-6">{body}</p>}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-fg-token bg-bg-token rounded hover:opacity-80 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50',
                styles.button
              )}
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Aguarde...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';

export default Modal;
