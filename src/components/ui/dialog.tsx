/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, { createContext, useContext, useId } from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

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

/**
 * Contexto que liga o `DialogTitle` ao `Dialog` que o contém: o Dialog gera um
 * id estável e o DialogTitle renderiza seu heading com ele, para o diálogo se
 * nomear sozinho. A ligação é feita de forma SÍNCRONA (no primeiro commit, sem
 * effect nem round-trip de estado), garantindo que o `aria-labelledby` já esteja
 * presente antes de o Modal mover o foco para dentro do painel.
 */
interface DialogTitleContextValue {
  /** Id estável gerado pelo Dialog para o heading do título. */
  defaultTitleId: string;
}

const DialogTitleContext = createContext<DialogTitleContextValue | null>(null);

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  className,
  ariaLabel,
  ariaLabelledby,
}) => {
  const defaultTitleId = useId();

  // Precedência do nome acessível: aria-labelledby explícito → heading do
  // DialogTitle (id estável, presente já no primeiro render) → aria-label
  // (resolvido pelo Modal). Como o DialogTitle usa este mesmo id por padrão, o
  // vínculo existe desde o commit inicial — não depende de effect.
  const resolvedLabelledby =
    ariaLabelledby ?? (ariaLabel ? undefined : defaultTitleId);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      className={className}
      showCloseButton={false}
      ariaLabel={ariaLabel}
      ariaLabelledby={resolvedLabelledby}
    >
      <DialogTitleContext.Provider value={{ defaultTitleId }}>
        {children}
      </DialogTitleContext.Provider>
    </Modal>
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
  const ctx = useContext(DialogTitleContext);
  const generatedId = useId();
  // Id efetivo do heading: id explícito → id padrão do Dialog → fallback local.
  // Sem effect: o Dialog já aponta seu aria-labelledby para `defaultTitleId`,
  // então usar esse mesmo id aqui fecha o vínculo já no primeiro render.
  const resolvedId = id ?? ctx?.defaultTitleId ?? generatedId;

  return (
    <h2
      id={resolvedId}
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-white',
        className
      )}
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
