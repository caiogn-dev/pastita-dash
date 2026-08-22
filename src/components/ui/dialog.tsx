/**
 * Dialog Component - Alias for Modal with Dialog-like API
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Modal } from './modal';
import { cn } from '../../utils/cn';

// Contexto que liga o `DialogTitle` ao `Dialog` que o contém. O `Dialog` gera um
// `titleId` estável e o expõe aqui; ao montar, um `DialogTitle` sem `id` próprio
// adota esse id e se registra. Assim o diálogo composto ganha nome acessível
// SOZINHO (WCAG 4.1.2), sem o consumidor passar `ariaLabelledby` à mão.
// `registerTitle` retorna a função de baixa (unregister): o registro é CONTADO,
// então remover/condicionar o `DialogTitle` desfaz o vínculo e o diálogo volta
// ao fallback `ariaLabel` em vez de apontar para um id que sumiu. Fora de um
// `Dialog` o contexto é nulo e o `DialogTitle` vira um heading comum.
interface DialogContextValue {
  titleId: string;
  registerTitle: () => () => void;
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
  // Contagem de `DialogTitle`s registrados (não um booleano de mão única): cada
  // título registrado incrementa, a baixa decrementa. Assim títulos condicionais
  // ou trocados por `id` próprio não deixam o diálogo preso a um id inexistente.
  const [titleCount, setTitleCount] = useState(0);
  const registerTitle = useCallback(() => {
    setTitleCount((c) => c + 1);
    return () => setTitleCount((c) => Math.max(0, c - 1));
  }, []);

  const contextValue = useMemo<DialogContextValue>(
    () => ({ titleId, registerTitle }),
    [titleId, registerTitle]
  );

  // Precedência do nome acessível: `ariaLabelledby` explícito → `DialogTitle`
  // registrado (usa o `titleId` gerado) → `ariaLabel`. Só apontamos o
  // `aria-labelledby` para o `titleId` quando há título registrado — apontar
  // para um id inexistente deixaria o diálogo sem nome.
  const resolvedLabelledby = ariaLabelledby ?? (titleCount > 0 ? titleId : undefined);

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

  // `useLayoutEffect` (não `useEffect`): o registro e o re-render do `Dialog` que
  // adiciona o `aria-labelledby` acontecem na fase de layout, ANTES dos efeitos
  // passivos — incluindo o `useEffect` do `Modal` que move o foco para dentro do
  // diálogo ao abrir. Sem isso, no primeiro open a AT poderia anunciar um diálogo
  // sem nome. O cleanup dá baixa no registro quando o título some.
  useLayoutEffect(() => {
    if (!usesContextId) return;
    return context!.registerTitle();
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
