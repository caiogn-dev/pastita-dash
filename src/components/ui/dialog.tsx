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
 * Liga `DialogTitle` ↔ `Dialog` para nomear o diálogo automaticamente, sem o
 * consumidor precisar passar `ariaLabel`/`ariaLabelledby` à mão.
 *
 * O `Dialog` publica um `fallbackId` (um id gerado) que o `DialogTitle` adota no
 * seu `<h2>` quando não recebe um `id` explícito. Como o título pode trazer o
 * PRÓPRIO `id`, ele registra de volta (via `registerTitleId`) o id que realmente
 * usou; o `Dialog` então aponta o `aria-labelledby` do diálogo exatamente para
 * esse id. Sem esse retorno, um `<DialogTitle id="x">` sem `ariaLabelledby`
 * deixava o `aria-labelledby` apontando para um id inexistente → diálogo sem nome.
 *
 * Fica `null` quando o consumidor já nomeou o diálogo (não sobrescrevemos).
 */
interface DialogTitleWiring {
  /** Id gerado que o título adota quando não tem `id` próprio. */
  fallbackId: string;
  /** O título informa o id que de fato usou (próprio ou o fallback). */
  registerTitleId: (id: string) => void;
}

const DialogTitleIdContext = createContext<DialogTitleWiring | null>(null);

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
  // e não fazemos o auto-wire.
  const generatedTitleId = useId();
  const explicitlyNamed = Boolean(ariaLabelledby || ariaLabel);

  // Id que o DialogTitle informou ter usado. Começa no id gerado (fallback), que
  // já cobre o caso comum (título sem id próprio) sem esperar por efeito; se o
  // título trouxer um id explícito, o registro atualiza para ele.
  const [registeredTitleId, setRegisteredTitleId] = useState(generatedTitleId);

  const wiring = useMemo<DialogTitleWiring | null>(
    () =>
      explicitlyNamed
        ? null
        : { fallbackId: generatedTitleId, registerTitleId: setRegisteredTitleId },
    [explicitlyNamed, generatedTitleId]
  );

  const autoTitleId = explicitlyNamed ? undefined : registeredTitleId;

  return (
    <DialogTitleIdContext.Provider value={wiring}>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        className={className}
        showCloseButton={false}
        ariaLabel={ariaLabel}
        ariaLabelledby={ariaLabelledby ?? autoTitleId}
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
  // Um id explícito sempre vence; senão adota o fallback publicado pelo Dialog.
  const wiring = useContext(DialogTitleIdContext);
  const resolvedId = id ?? wiring?.fallbackId;

  // Informa ao Dialog qual id o título de fato usou, para o aria-labelledby do
  // diálogo apontar sempre para este heading (inclusive quando o id é explícito).
  useEffect(() => {
    if (wiring && resolvedId) wiring.registerTitleId(resolvedId);
  }, [wiring, resolvedId]);

  return (
    <h2
      id={resolvedId}
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
