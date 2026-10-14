/**
 * Rótulo, controle, dica e erro num lugar só — o jeito de pôr um campo na
 * tela. Medido em 13/10: 216 rótulos montados à mão em 57 arquivos, cada um
 * com tamanho, cor e espaço próprios, e quase nenhum ligado ao campo (leitor
 * de tela lia "campo de texto" sem dizer qual).
 *
 * O controle é o filho: `Input`, `Select`, `Textarea`, `CampoDeDinheiro`…
 * O Campo entrega a ele `id`, `aria-invalid`, `aria-describedby` e `required`.
 * Com erro, a dica sai: duas linhas embaixo do campo competem.
 */
import React, { cloneElement, isValidElement, useId } from 'react';

import { cn } from '../../utils/cn';

export interface CampoProps {
  rotulo: string;
  dica?: React.ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  /** Algo à direita do rótulo: contador "120/1000", link "Ver exemplo". */
  extra?: React.ReactNode;
  className?: string;
  children: React.ReactElement;
}

type PropsDoControle = {
  id?: string;
  required?: boolean;
  'aria-invalid'?: boolean | 'true';
  'aria-describedby'?: string;
};

export const Campo: React.FC<CampoProps> = ({ rotulo, dica, erro, obrigatorio = false, extra, className, children }) => {
  const base = useId();
  const filho = isValidElement<PropsDoControle>(children) ? children : null;
  const id = filho?.props.id ?? `${base}-campo`;
  const idDaNota = `${base}-nota`;
  const nota = erro || dica;

  const descritoPor = [filho?.props['aria-describedby'], nota ? idDaNota : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        {/* Asterisco e não a palavra: em coluna estreita "obrigatório"
            empurrava o rótulo para duas linhas e desalinhava o vizinho. Fica
            FORA do <label> para o nome do campo continuar sendo só o rótulo;
            o `required` no controle já é anunciado pelo leitor de tela. */}
        <span className="flex items-baseline">
          <label htmlFor={id} className={cn('text-sm font-medium', erro ? 'text-danger-500' : 'text-fg-token')}>
            {rotulo}
          </label>
          {obrigatorio && <span aria-hidden data-obrigatorio className="ml-0.5 text-sm text-danger-500">*</span>}
        </span>
        {extra && <span className="flex items-baseline gap-2 text-xs text-fg-muted-token">{extra}</span>}
      </div>

      {filho
        ? cloneElement(filho, {
            id,
            required: obrigatorio || filho.props.required,
            'aria-invalid': erro ? true : filho.props['aria-invalid'],
            'aria-describedby': descritoPor,
          })
        : children}

      {nota && (
        <p id={idDaNota} className={cn('text-xs', erro ? 'text-danger-500' : 'text-fg-muted-token')} role={erro ? 'alert' : undefined}>
          {nota}
        </p>
      )}
    </div>
  );
};

Campo.displayName = 'Campo';

export default Campo;
