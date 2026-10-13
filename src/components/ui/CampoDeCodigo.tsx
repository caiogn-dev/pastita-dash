/**
 * Código de verificação (WhatsApp/SMS) — o único jeito de pedir os 6 dígitos.
 *
 * Por baixo é UM `<input>` de verdade, transparente, por cima das caixas: ele
 * recebe o preenchimento automático do celular (`one-time-code`), o colar e o
 * apagar. Seis inputs separados quebram as três coisas. As caixas são só
 * desenho, em 3 + 3 como o código chega na mensagem. Completou → `onCompleto`
 * com o código NOVO (nada de ler estado velho num setTimeout).
 *
 * Gêmeo na vitrine: cardapidex-web/src/components/ui/CampoDeCodigo.jsx.
 */
import React, { Fragment, useEffect, useRef, useState } from 'react';

import { cn } from '../../utils/cn';

export interface CampoDeCodigoProps {
  valor: string;
  onMudar: (codigo: string) => void;
  onCompleto?: (codigo: string) => void;
  comprimento?: number;
  erro?: boolean;
  desabilitado?: boolean;
  autoFocus?: boolean;
  rotulo?: string;
  className?: string;
}

export const CampoDeCodigo: React.FC<CampoDeCodigoProps> = ({
  valor,
  onMudar,
  onCompleto,
  comprimento = 6,
  erro = false,
  desabilitado = false,
  autoFocus = false,
  rotulo = 'Código de 6 dígitos',
  className,
}) => {
  const campo = useRef<HTMLInputElement | null>(null);
  const [focado, setFocado] = useState(false);
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, comprimento);

  useEffect(() => {
    if (autoFocus) campo.current?.focus();
  }, [autoFocus]);

  const mudar = (bruto: string) => {
    const novo = bruto.replace(/\D/g, '').slice(0, comprimento);
    onMudar(novo);
    if (novo.length === comprimento && novo !== digitos) onCompleto?.(novo);
  };

  const ativo = Math.min(digitos.length, comprimento - 1);
  const metade = Math.ceil(comprimento / 2);

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2',
        erro && 'motion-safe:animate-wiggle',
        desabilitado ? 'opacity-60' : 'cursor-text',
        className
      )}
      onClick={() => campo.current?.focus()}
    >
      <input
        ref={campo}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        name="codigo"
        maxLength={comprimento}
        aria-label={rotulo}
        aria-invalid={erro || undefined}
        disabled={desabilitado}
        value={digitos}
        onChange={(e) => mudar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && digitos.length === comprimento) onCompleto?.(digitos);
        }}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        // 16px: abaixo disso o iOS dá zoom ao focar.
        className="absolute inset-0 z-10 h-full w-full cursor-text border-0 bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
      />
      {Array.from({ length: comprimento }, (_, i) => {
        const atual = focado && i === ativo;
        return (
          <Fragment key={i}>
            {i === metade && <span data-separador aria-hidden className="h-0.5 w-2.5 rounded-full bg-border-strong-token" />}
            <span
              data-caixa
              aria-hidden
              className={cn(
                'flex h-14 w-12 items-center justify-center rounded-lg border-2 bg-surface text-2xl font-bold tabular-nums text-fg-token transition-colors',
                erro
                  ? 'border-danger-token'
                  : atual
                    ? 'border-brand ring-4 ring-brand-soft'
                    : digitos[i]
                      ? 'border-strong-token'
                      : 'border-border-token'
              )}
            >
              {digitos[i] || ''}
              {atual && !digitos[i] && <span className="h-6 w-0.5 animate-pulse rounded-full bg-brand" />}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
};

CampoDeCodigo.displayName = 'CampoDeCodigo';

export default CampoDeCodigo;
