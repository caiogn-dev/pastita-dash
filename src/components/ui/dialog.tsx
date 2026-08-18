/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
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
 * Contexto que liga o `DialogTitle` ao `Dialog` que o contém: o título registra
 * seu id e o diálogo o usa como `aria-labelledby`, nomeando-se sozinho.
 */
interface DialogTitleContextValue {
  /** Id padrão gerado pelo Dialog para o heading do título. */
  defaultTitleId: string;
  /** Registra o id do heading efetivamente usado. */
  register: (id: string) => void;
  /** Desfaz o registro ao desmontar o título. */
  unregister: () => void;
}

const DialogTitleContext = createContext<DialogTitleContextValue | null>(
  null
);

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  className,
  ariaLabel,
  ariaLabelledby,
}) => {
  const defaultTitleId = useId();
  const [registeredTitleId, setRegisteredTitleId] = useState<
    string | null
  >(null);

  const register = useCallback(
    (id: string) => setRegisteredTitleId(id),
    []
  );
  const unregister = useCallback(() => setRegisteredTitleId(null), []);

  const titleContext = useMemo<DialogTitleContextValue>(
    () => ({ defaultTitleId, register, unregister }),
    [defaultTitleId, register, unregister]
  );

  // Precedência do nome acessível: aria-labelledby explícito → DialogTitle
  // registrado → aria-label (resolvido pelo Modal).
  const resolvedLabelledby = ariaLabelledby ?? registeredTitleId ?? undefined;

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      className={className}
      showCloseButton={false}
      ariaLabel={ariaLabel}
      ariaLabelledby={resolvedLabelledby}
    >
      <DialogTitleContext.Provider value={titleContext}>
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
  const resolvedId = id ?? ctx?.defaultTitleId ?? generatedId;

  useEffect(() => {
    if (!ctx) return;
    ctx.register(resolvedId);
    return () => ctx.unregister();
  }, [ctx, resolvedId]);

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
