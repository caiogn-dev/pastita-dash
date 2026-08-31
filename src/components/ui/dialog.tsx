/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, { createContext, useContext, useId, useLayoutEffect, useMemo, useState } from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

/**
 * Contexto que liga `DialogTitle` ↔ `Dialog`. O `Dialog` oferece um id gerado
 * (fallback) e recebe do `DialogTitle` o id do heading que efetivamente nomeia
 * o diálogo. Assim o caminho composto (Dialog + DialogTitle) fica com nome
 * acessível automático — sem o consumidor passar `ariaLabelledby` à mão.
 */
interface DialogContextValue {
  fallbackTitleId: string;
  registerTitle: (id: string) => void;
  unregisterTitle: (id: string) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// Dialog is just an alias for Modal
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /** Nome acessível do diálogo (repassado ao Modal). */
  ariaLabel?: string;
  /** Id do heading que nomeia o diálogo (repassado ao Modal). */
  ariaLabelledby?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  className,
  ariaLabel,
  ariaLabelledby,
}) => {
  const fallbackTitleId = useId();
  // Id do heading detectado por um `DialogTitle` filho (se houver). Enquanto
  // nenhum título se registra, fica `undefined` — nunca apontamos o
  // aria-labelledby para um id inexistente.
  const [detectedTitleId, setDetectedTitleId] = useState<string | undefined>(undefined);

  const ctx = useMemo<DialogContextValue>(
    () => ({
      fallbackTitleId,
      registerTitle: (id) => setDetectedTitleId(id),
      unregisterTitle: (id) =>
        setDetectedTitleId((prev) => (prev === id ? undefined : prev)),
    }),
    [fallbackTitleId]
  );

  // Precedência: aria-labelledby explícito → título detectado (DialogTitle) →
  // aria-label. O `Modal` decide o resto (ver modal.tsx).
  const effectiveLabelledby = ariaLabelledby ?? detectedTitleId;

  return (
    <DialogContext.Provider value={ctx}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={effectiveLabelledby}
      >
        {children}
      </Modal>
    </DialogContext.Provider>
  );
};

// DialogContent wraps ModalBody
export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

// DialogHeader
export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('mb-4', className)} {...props}>
    {children}
  </div>
);

// DialogTitle
export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle: React.FC<DialogTitleProps> = ({
  children,
  className,
  id,
  ...props
}) => {
  const ctx = useContext(DialogContext);
  // Dentro de um Dialog: adota o id gerado pelo Dialog (ou o id próprio, se
  // informado) e registra-se como o heading que nomeia o diálogo. Fora de um
  // Dialog, comporta-se como um heading comum.
  const resolvedId = ctx ? id ?? ctx.fallbackTitleId : id;

  useLayoutEffect(() => {
    if (!ctx || !resolvedId) return;
    ctx.registerTitle(resolvedId);
    return () => ctx.unregisterTitle(resolvedId);
  }, [ctx, resolvedId]);

  return (
    <h2
      id={resolvedId}
      className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}
      {...props}
    >
      {children}
    </h2>
  );
};

// DialogDescription
export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({
  children,
  className,
  ...props
}) => (
  <p
    className={cn('text-sm text-gray-500 dark:text-zinc-400 mt-1', className)}
    {...props}
  >
    {children}
  </p>
);

export default Dialog;
