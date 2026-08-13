/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

// Contexto que liga <DialogTitle> ↔ <Dialog>: o título se auto-registra e o
// diálogo passa a apontar `aria-labelledby` para ele. Sem isso, o caminho
// composto (Dialog + DialogTitle) renderizava um role="dialog" SEM nome
// acessível — leitores de tela anunciavam só "diálogo". Agora qualquer diálogo
// com título ganha nome de graça, sem o consumidor passar `ariaLabelledby`.
interface DialogTitleContextValue {
  /** Id gerado pelo Dialog para o título usar quando não trouxer um `id` próprio. */
  titleId: string;
  /** DialogTitle avisa o Dialog qual id de fato nomeia o diálogo. */
  registerTitle: (id: string) => void;
  /** DialogTitle desregistra ao desmontar (evita apontar para heading que sumiu). */
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
  const generatedTitleId = useId();
  const [registeredTitleId, setRegisteredTitleId] = useState<string | undefined>(undefined);

  const titleContext = useMemo<DialogTitleContextValue>(
    () => ({
      titleId: generatedTitleId,
      registerTitle: (id) => setRegisteredTitleId(id),
      unregisterTitle: (id) =>
        setRegisteredTitleId((current) => (current === id ? undefined : current)),
    }),
    [generatedTitleId]
  );

  // Precedência: ariaLabelledby explícito → título auto-registrado. O Modal
  // ainda resolve ariaLabel como último recurso quando não há labelledby.
  const labelledBy = ariaLabelledby ?? registeredTitleId;

  return (
    <DialogTitleContext.Provider value={titleContext}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={labelledBy}
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
  const titleContext = useContext(DialogTitleContext);
  // Usa o `id` explícito do consumidor, senão o id gerado pelo Dialog.
  const effectiveId = id ?? titleContext?.titleId;

  // useLayoutEffect (não useEffect): o registro faz `setState` no Dialog, que
  // aplica o `aria-labelledby` num segundo render. O `Modal` move o foco pra
  // dentro do painel a partir de um efeito PASSIVO (modal.tsx). Se o registro
  // fosse passivo também, o foco chegaria ao diálogo AINDA sem nome no primeiro
  // render, e leitores de tela que anunciam no foco não repetiriam depois da
  // mutação tardia do atributo. Um efeito de layout roda síncrono antes do
  // paint e força o re-render do nome ANTES de o efeito passivo do foco disparar.
  useLayoutEffect(() => {
    if (!titleContext || !effectiveId) return;
    titleContext.registerTitle(effectiveId);
    return () => titleContext.unregisterTitle(effectiveId);
  }, [titleContext, effectiveId]);

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
