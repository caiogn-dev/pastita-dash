/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

/**
 * Liga `DialogTitle` ↔ `Dialog`: o `DialogTitle` registra o id do seu heading
 * e o `Dialog` o usa como `aria-labelledby`, dando nome acessível ao diálogo
 * sem o consumidor ter que passar `ariaLabelledby` à mão e casar ids.
 */
interface DialogTitleContextValue {
  /** Id sugerido para o heading quando o consumidor não passa um id próprio. */
  titleId: string;
  /** Informa ao Dialog qual id de heading está nomeando o diálogo (ou nenhum). */
  setLabelledbyId: (id: string | undefined) => void;
}

const DialogTitleContext = createContext<DialogTitleContextValue | null>(null);

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
  const generatedTitleId = useId();
  // Id do heading que um `DialogTitle` filho registrou (undefined até registrar).
  const [titleLabelledbyId, setTitleLabelledbyId] = useState<string | undefined>(undefined);

  const ctx = useMemo<DialogTitleContextValue>(
    () => ({ titleId: generatedTitleId, setLabelledbyId: setTitleLabelledbyId }),
    [generatedTitleId]
  );

  // Precedência: `ariaLabelledby` explícito → id do `DialogTitle` registrado →
  // `ariaLabel`. Nunca aponta para um id inexistente: se não há título, fica
  // undefined e o Modal cai no `ariaLabel` (ou em nome nenhum).
  const resolvedLabelledby = ariaLabelledby ?? titleLabelledbyId;

  return (
    <DialogTitleContext.Provider value={ctx}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={resolvedLabelledby}
      >
        {children}
      </Modal>
    </DialogTitleContext.Provider>
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
  // Usa o id próprio do consumidor, se houver; senão o id sugerido pelo Dialog.
  const titleId = id ?? ctx?.titleId;

  // Enquanto montado, informa ao Dialog o id que nomeia o diálogo; ao
  // desmontar, retira o registro para o Dialog não apontar para um id órfão.
  useEffect(() => {
    if (!ctx) return;
    ctx.setLabelledbyId(titleId);
    return () => ctx.setLabelledbyId(undefined);
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
