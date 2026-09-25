import React, { forwardRef, useId } from 'react';

import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Rótulo visível, ligado ao campo. */
  label?: string;
  /** Mensagem de erro sob o campo; marca `aria-invalid`. */
  error?: string;
  /** Dica sob o campo quando não há erro. */
  hint?: string;
}

/**
 * Campo de texto longo do painel — mesma API e mesma borda do `Input`
 * (`label`, `error`, `hint`, `border-border-input` pelo contraste de 3:1).
 * O `common/Textarea` era cinza cru e sem rótulo; por isso as telas escreviam
 * `<textarea>` à mão.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, rows = 3, ...props }, ref) => {
    const gerado = useId();
    const idDoCampo = id ?? `txt-${gerado}`;
    const ajuda = error || hint;
    const idDaAjuda = `${idDoCampo}-ajuda`;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={idDoCampo} className="block text-sm font-medium text-fg-token">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={idDoCampo}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={ajuda ? idDaAjuda : undefined}
          className={cn(
            'w-full resize-y rounded border bg-surface px-4 py-2.5 text-sm text-fg-token placeholder-fg-muted-token transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
            error ? 'border-danger-token' : 'border-border-input',
            className,
          )}
          {...props}
        />
        {ajuda && (
          <p id={idDaAjuda} className={cn('text-xs', error ? 'text-danger-token' : 'text-fg-muted-token')}>
            {ajuda}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
