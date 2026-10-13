/**
 * Escolha excludente em que cada opção MOSTRA o resultado.
 *
 * `ChoiceCards` nomeia e explica os lados de uma decisão em texto. Aparência é
 * outra coisa: "Direita" ou "Paisagem 16:9" escrito num cartão obriga o dono a
 * imaginar o cardápio. Aqui cada opção traz um desenho do resultado (com a foto
 * e o logo de verdade da loja, quando houver) e o nome curto embaixo. A dica
 * longa vai no `title`, não na tela (DESIGN_SYSTEM §6).
 *
 * Mesmo contrato de teclado do ChoiceCards: radiogroup, setas, um Tab só.
 */
import React, { useRef } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { cn } from '../../utils/cn';

export interface OpcaoVisual<T extends string = string> {
  valor: T;
  titulo: string;
  desenho: React.ReactNode;
  /** Vira o `title` do botão. */
  dica?: string;
}

export interface EscolhaVisualProps<T extends string = string> {
  rotulo: string;
  opcoes: OpcaoVisual<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Diferente do que está salvo: ganha um ponto ao lado do rótulo. */
  mudou?: boolean;
  colunas?: 2 | 3 | 4;
  /** Desenho com texto (ex.: descrição cortada) pede mais altura. */
  desenhoAlto?: boolean;
  className?: string;
}

const GRADE = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

export function EscolhaVisual<T extends string = string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  mudou = false,
  colunas = 4,
  desenhoAlto = false,
  className,
}: EscolhaVisualProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const mover = (delta: number) => {
    const i = opcoes.findIndex((o) => o.valor === valor);
    const proximo = opcoes[(i + delta + opcoes.length) % opcoes.length];
    onChange(proximo.valor);
    requestAnimationFrame(() => refs.current[proximo.valor]?.focus());
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      mover(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      mover(-1);
    }
  };

  const nenhumaEscolhida = !opcoes.some((x) => x.valor === valor);

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 flex items-center gap-2 text-body font-semibold text-fg-token">
        {rotulo}
        {mudou && (
          <span
            className="inline-block h-2 w-2 rounded-full bg-brand"
            aria-label="Alterado, ainda não salvo"
            title="Alterado, ainda não salvo"
          />
        )}
      </legend>

      <div role="radiogroup" aria-label={rotulo} onKeyDown={aoTeclar} className={cn('grid gap-2.5', GRADE[colunas])}>
        {opcoes.map((o, idx) => {
          const escolhida = o.valor === valor;
          return (
            <button
              key={o.valor}
              ref={(el) => { refs.current[o.valor] = el; }}
              type="button"
              role="radio"
              aria-checked={escolhida}
              title={o.dica}
              tabIndex={escolhida || (nenhumaEscolhida && idx === 0) ? 0 : -1}
              onClick={() => onChange(o.valor)}
              className={cn(
                'group relative flex flex-col items-stretch gap-2 rounded-lg border p-2 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                escolhida
                  ? 'border-brand bg-brand-soft shadow-repouso'
                  : 'border-border-token bg-surface hover:-translate-y-0.5 hover:border-strong-token'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center overflow-hidden rounded-md bg-surface-2',
                  desenhoAlto ? 'h-40' : 'h-28'
                )}
                aria-hidden
              >
                {o.desenho}
              </span>
              <span className={cn('px-0.5 text-caption font-semibold', escolhida ? 'text-brand-ink' : 'text-fg-token')}>
                {o.titulo}
              </span>
              {escolhida && (
                <CheckCircleIcon className="absolute right-1.5 top-1.5 h-5 w-5 text-brand" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

EscolhaVisual.displayName = 'EscolhaVisual';

export default EscolhaVisual;
