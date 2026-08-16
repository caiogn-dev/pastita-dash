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

/**
 * Fio automático de nome acessível no caminho composto: um `<DialogTitle>` que
 * renderiza dentro de um `<Dialog>` registra o id do seu heading, e o `Dialog`
 * o repassa como `aria-labelledby` ao `Modal`. Assim qualquer consumidor que use
 * `DialogTitle` ganha nome acessível sem refazer o fio à mão (WCAG 4.1.2). Se
 * nenhum `DialogTitle` registrar, nada é apontado — nunca deixamos um
 * `aria-labelledby` pendurado para um id inexistente.
 */
interface DialogTitleContextValue {
  /** Id estável que o DialogTitle deve usar no heading, se não trouxer id próprio. */
  titleId: string;
  registerTitle: (id: string) => void;
  unregisterTitle: (id: string) => void;
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
  const fallbackTitleId = useId();
  const [registeredTitleId, setRegisteredTitleId] = useState<string | undefined>();

  const registerTitle = useCallback((id: string) => setRegisteredTitleId(id), []);
  const unregisterTitle = useCallback(
    (id: string) => setRegisteredTitleId((prev) => (prev === id ? undefined : prev)),
    []
  );

  const ctx = useMemo<DialogTitleContextValue>(
    () => ({ titleId: fallbackTitleId, registerTitle, unregisterTitle }),
    [fallbackTitleId, registerTitle, unregisterTitle]
  );

  // Precedência: aria-labelledby explícito → aria-label explícito → título
  // automático do DialogTitle. Props explícitas sempre vencem o fio automático.
  const resolvedLabelledby =
    ariaLabelledby ?? (ariaLabel ? undefined : registeredTitleId);

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
  // Usa id próprio do consumidor se houver; senão o id estável do contexto.
  const effectiveId = id ?? ctx?.titleId;

  // Registra o heading no Dialog pai para nomear o diálogo automaticamente.
  useEffect(() => {
    if (!ctx || !effectiveId) return;
    ctx.registerTitle(effectiveId);
    return () => ctx.unregisterTitle(effectiveId);
  }, [ctx, effectiveId]);

  return (
    <h2
      id={effectiveId}
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
