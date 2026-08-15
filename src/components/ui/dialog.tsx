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

// Contexto que liga o `DialogTitle` ao `Dialog` que o contém. O `Dialog` gera um
// `titleId` estável e o expõe aqui; ao montar, um `DialogTitle` sem `id` próprio
// adota esse id e avisa que existe um título. Assim o diálogo composto ganha
// nome acessível SOZINHO (WCAG 4.1.2), sem o consumidor passar `ariaLabelledby`
// à mão. `registerTitle` é opcional para o `DialogTitle` renderizado fora de um
// `Dialog` (fallback: vira um heading comum).
interface DialogContextValue {
  titleId: string;
  registerTitle: () => void;
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
  const [hasTitle, setHasTitle] = useState(false);
  const registerTitle = useCallback(() => setHasTitle(true), []);

  const contextValue = useMemo<DialogContextValue>(
    () => ({ titleId, registerTitle }),
    [titleId, registerTitle]
  );

  // Precedência do nome acessível: `ariaLabelledby` explícito → `DialogTitle`
  // registrado (usa o `titleId` gerado) → `ariaLabel`. Só apontamos o
  // `aria-labelledby` para o `titleId` quando um título de fato se registrou —
  // apontar para um id inexistente deixaria o diálogo sem nome.
  const resolvedLabelledby = ariaLabelledby ?? (hasTitle ? titleId : undefined);

  return (
    <DialogContext.Provider value={contextValue}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={resolvedLabelledby ? undefined : ariaLabel}
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
  const context = useContext(DialogContext);
  // Se o consumidor deu um `id` próprio, respeitamos e não mexemos no nome do
  // diálogo (ele assume o controle via `ariaLabelledby`). Caso contrário,
  // adotamos o `titleId` do contexto e registramos o título no `Dialog`.
  const usesContextId = !id && !!context;
  const effectiveId = id ?? (context?.titleId);

  useEffect(() => {
    if (usesContextId) context!.registerTitle();
  }, [usesContextId, context]);

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
