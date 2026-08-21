/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

/**
 * Contexto que liga `DialogTitle` ao `Dialog` para nome acessível automático.
 * O `Dialog` gera um id estável e o expõe aqui; o `DialogTitle` aplica esse id
 * ao seu heading e sinaliza presença (register/unregister). Só quando há um
 * `DialogTitle` montado é que o `Dialog` aponta `aria-labelledby` para o id —
 * assim nunca criamos referência pendente para um heading inexistente.
 */
interface DialogContextValue {
  titleId: string;
  registerTitle: () => void;
  unregisterTitle: () => void;
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
  const titleId = useId();
  const [titleCount, setTitleCount] = useState(0);

  const ctx = useMemo<DialogContextValue>(
    () => ({
      titleId,
      registerTitle: () => setTitleCount((c) => c + 1),
      unregisterTitle: () => setTitleCount((c) => c - 1),
    }),
    [titleId]
  );

  // Precedência do nome acessível: ariaLabelledby explícito → DialogTitle
  // presente (auto) → ariaLabel explícito. Sem título e sem ariaLabel, o Modal
  // fica sem nome (não inventamos uma referência pendente).
  const hasTitle = titleCount > 0;
  const resolvedLabelledby =
    ariaLabelledby ?? (!ariaLabel && hasTitle ? titleId : undefined);

  return (
    <DialogContext.Provider value={ctx}>
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
  // Um id explícito do consumidor mantém o controle manual (retrocompatível):
  // nesse caso não registramos e o Dialog não auto-nomeia por este heading.
  const usesContextId = !id && !!ctx;

  useEffect(() => {
    if (!usesContextId || !ctx) return;
    ctx.registerTitle();
    return () => ctx.unregisterTitle();
  }, [usesContextId, ctx]);

  return (
    <h2
      id={id ?? (usesContextId ? ctx?.titleId : undefined)}
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
