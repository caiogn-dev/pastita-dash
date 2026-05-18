import React, { useCallback, useRef, useState } from 'react';
import { ConfirmModal } from '../components/common/Modal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

type ResolverFn = (value: boolean) => void;

/**
 * Provides a programmatic confirmation dialog backed by ConfirmModal.
 *
 * Usage:
 *   const [ConfirmDialog, confirm] = useConfirm();
 *
 *   const confirmed = await confirm({ title: 'Excluir?', message: '...' });
 *   if (!confirmed) return;
 *
 *   // Render ConfirmDialog somewhere in the component's JSX
 *   return <>{ConfirmDialog}</ ...rest>
 */
export function useConfirm(): [React.ReactNode, (opts: ConfirmOptions) => Promise<boolean>] {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });
  const resolverRef = useRef<ResolverFn | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const dialog = (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
    />
  );

  return [dialog, confirm];
}
