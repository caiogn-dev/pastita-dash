/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, { createContext, useContext, useId } from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

/**
 * Liga `DialogTitle` ↔ `Dialog`: o `Dialog` gera um id e o publica aqui; o
 * `DialogTitle` o adota no seu `<h2>` e o `Dialog` aponta o `aria-labelledby`
 * do diálogo para ele. Assim o título nomeia o diálogo automaticamente, sem o
 * consumidor precisar passar `ariaLabel`/`ariaLabelledby` à mão. Fica `null`
 * quando o consumidor já forneceu um nome explícito (não sobrescrevemos).
 */
const DialogTitleIdContext = createContext<string | null>(null);

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
  // Se o consumidor já nomeou o diálogo (ariaLabelledby/ariaLabel), respeitamos
  // e não fazemos o auto-wire. Caso contrário, geramos um id para o DialogTitle
  // adotar e nomeamos o diálogo por ele.
  const generatedTitleId = useId();
  const autoTitleId =
    ariaLabelledby || ariaLabel ? null : generatedTitleId;

  return (
    <DialogTitleIdContext.Provider value={autoTitleId}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={ariaLabelledby ?? autoTitleId ?? undefined}
      >
        {children}
      </Modal>
    </DialogTitleIdContext.Provider>
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
  // Um id explícito sempre vence; senão adota o id publicado pelo Dialog para
  // nomear o diálogo automaticamente.
  const autoTitleId = useContext(DialogTitleIdContext);
  return (
    <h2
      id={id ?? autoTitleId ?? undefined}
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
