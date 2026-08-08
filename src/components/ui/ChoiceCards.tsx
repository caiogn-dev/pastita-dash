/**
 * Escolha excludente como cards nomeados, não como toggle.
 *
 * Um toggle mostra UM rótulo e esconde metade da decisão: "Ativo" ligado você
 * entende; desligado, adivinha — expirado? escondido? excluído? Toggle é ótimo
 * para claro/escuro, onde os dois estados são óbvios, o efeito é imediato e
 * desfazer custa um clique. `is_active` num cupom não é nada disso: o estado
 * desligado muda o que o cliente consegue fazer no checkout, e o efeito só
 * aparece na loja.
 *
 * Dois cards nomeiam e explicam OS DOIS lados antes da escolha.
 *
 * É um `radiogroup` de verdade, com navegação por setas — sem isso quem usa
 * teclado gasta um Tab por opção, e num grupo de quatro fica pior que o
 * `<select>` nativo que estamos substituindo.
 */
import React, { useRef } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { cn } from '../../utils/cn';

export interface OpcaoDeEscolha<T extends string = string> {
  valor: T;
  titulo: string;
  /** A consequência de escolher esta opção. É o que o toggle não conta. */
  descricao: string;
  icone?: React.ComponentType<{ className?: string }>;
}

export interface ChoiceCardsProps<T extends string = string> {
  rotulo: string;
  descricao?: string;
  opcoes: OpcaoDeEscolha<T>[];
  valor: T;
  onChange: (valor: T) => void;
  className?: string;
}

export function ChoiceCards<T extends string = string>({
  rotulo,
  descricao,
  opcoes,
  valor,
  onChange,
  className,
}: ChoiceCardsProps<T>) {
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

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2">
        <span className="block text-body font-semibold text-fg-token">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-caption text-fg-muted-token">{descricao}</span>
        )}
      </legend>

      <div
        role="radiogroup"
        aria-label={rotulo}
        onKeyDown={aoTeclar}
        className="grid grid-cols-2 gap-3 max-sm:grid-cols-1"
      >
        {opcoes.map((o) => {
          const Icone = o.icone;
          const escolhida = o.valor === valor;
          return (
            <button
              key={o.valor}
              ref={(el) => { refs.current[o.valor] = el; }}
              type="button"
              role="radio"
              aria-checked={escolhida}
              tabIndex={escolhida ? 0 : -1}
              onClick={() => onChange(o.valor)}
              className={cn(
                'flex items-start gap-2.5 rounded border p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                escolhida
                  ? 'border-brand bg-brand-soft'
                  : 'border-border-token bg-surface hover:bg-surface-2'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 shrink-0',
                  escolhida ? 'text-brand-ink' : 'text-fg-muted-token'
                )}
                aria-hidden
              >
                {Icone ? (
                  <Icone className="h-5 w-5" />
                ) : escolhida ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <span className="block h-5 w-5 rounded-full border-2 border-current" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-body font-semibold',
                    escolhida ? 'text-brand-ink' : 'text-fg-token'
                  )}
                >
                  {o.titulo}
                </span>
                <span className="mt-0.5 block text-caption text-fg-muted-token">
                  {o.descricao}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

ChoiceCards.displayName = 'ChoiceCards';

export default ChoiceCards;
