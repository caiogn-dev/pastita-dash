/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

// Contexto que liga DialogTitle↔Dialog: o DialogTitle registra o id do seu
// heading e o Dialog o repassa como aria-labelledby ao Modal. Assim, todo
// diálogo composto que tenha um DialogTitle ganha NOME ACESSÍVEL automático,
// sem o consumidor precisar passar aria-labelledby à mão (o esquecimento
// deixava o role="dialog" mudo para leitores de tela).
interface DialogContextValue {
  registerTitleId: (id: string | undefined) => void;
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
  // Id registrado pelo DialogTitle (quando houver). aria-labelledby explícito
  // do consumidor tem precedência sobre o título auto-detectado.
  const [registeredTitleId, setRegisteredTitleId] = useState<string | undefined>();
  const contextValue = useMemo<DialogContextValue>(
    () => ({ registerTitleId: setRegisteredTitleId }),
    []
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={ariaLabelledby ?? registeredTitleId}
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
  const generatedId = useId();
  const titleId = id ?? generatedId;

  // Registra este heading como nome acessível do Dialog enquanto montado.
  // Ao desmontar (diálogo fechado), limpa o registro para não apontar o
  // aria-labelledby para um id que não existe mais no DOM.
  useEffect(() => {
    ctx?.registerTitleId(titleId);
    return () => ctx?.registerTitleId(undefined);
  }, [ctx, titleId]);

  return (
    <h2
      id={titleId}
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
