/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, {
  createContext,
  isValidElement,
  useContext,
  useId,
  useMemo,
} from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

/**
 * Fio automático de nome acessível no caminho composto: um `<DialogTitle>` dentro
 * de um `<Dialog>` nomeia o diálogo sem o consumidor refazer o `aria-labelledby`
 * à mão (WCAG 4.1.2 / ARIA Dialog Pattern).
 *
 * A detecção é feita em tempo de RENDER, varrendo a árvore de `children` atrás de
 * um `<DialogTitle>` — de propósito NÃO via efeito/registro. O `Modal` move o
 * foco para dentro do diálogo num efeito passivo que só roda no commit de
 * abertura e não re-dispara quando um rótulo chega depois; um registro por efeito
 * commitaria o `aria-labelledby` tarde demais e o leitor de tela anunciaria um
 * diálogo sem nome no instante do foco. Varrer no render deixa o rótulo pronto já
 * no primeiro commit, antes do foco entrar. Sem `DialogTitle`, nada é apontado —
 * nunca deixamos um `aria-labelledby` pendurado para um id inexistente.
 */
interface DialogTitleContextValue {
  /** Id estável que o DialogTitle usa no heading quando não traz id próprio. */
  titleId: string;
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

/**
 * Varre a árvore de elementos à procura do primeiro `<DialogTitle>` e devolve o
 * id que ele usará no heading (`props.id` se informado, senão o `fallbackId`),
 * ou `undefined` se não houver título. Puro e síncrono — roda no render.
 */
function findDialogTitleId(
  node: React.ReactNode,
  fallbackId: string
): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findDialogTitleId(child, fallbackId);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === DialogTitle) {
    const ownId = (node.props as { id?: string }).id;
    return ownId ?? fallbackId;
  }
  const children = (node.props as { children?: React.ReactNode }).children;
  return children != null ? findDialogTitleId(children, fallbackId) : undefined;
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

  const ctx = useMemo<DialogTitleContextValue>(
    () => ({ titleId: fallbackTitleId }),
    [fallbackTitleId]
  );

  // Título detectado no render (ver comentário do módulo).
  const autoTitleId = useMemo(
    () => findDialogTitleId(children, fallbackTitleId),
    [children, fallbackTitleId]
  );

  // Precedência: aria-labelledby explícito → aria-label explícito → título
  // automático do DialogTitle. Props explícitas sempre vencem o fio automático.
  const resolvedLabelledby =
    ariaLabelledby ?? (ariaLabel ? undefined : autoTitleId);

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
  // Usa id próprio do consumidor se houver; senão o id estável do contexto — o
  // mesmo que o Dialog detectou no render e apontou como aria-labelledby.
  const effectiveId = id ?? ctx?.titleId;

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
