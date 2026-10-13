/**
 * Controle segmentado — a escolha excludente compacta de painel de
 * propriedades (Figma, Framer, editor de tema da Shopify). Uma faixa, um
 * segmento por opção, ícone + nome curto; com `soIcone` o nome vira tooltip
 * e rótulo acessível.
 *
 * Para decisão com consequência que precisa ser explicada, use `ChoiceCards`.
 * Aqui o efeito aparece na prévia ao lado — explicar sobra.
 */
import React, { useRef } from 'react';

import { cn } from '../../utils/cn';

export interface OpcaoSegmentada<T extends string = string> {
  valor: T;
  rotulo: string;
  icone?: React.ReactNode;
  dica?: string;
}

export interface SegmentadoProps<T extends string = string> {
  /** Nome do grupo para leitor de tela (o rótulo visível fica na Propriedade). */
  rotulo: string;
  opcoes: OpcaoSegmentada<T>[];
  valor: T;
  onChange: (valor: T) => void;
  soIcone?: boolean;
  /** Ícone em cima e nome embaixo — para nomes que não cabem ao lado do ícone. */
  empilhado?: boolean;
  className?: string;
}

export function Segmentado<T extends string = string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  soIcone = false,
  empilhado = false,
  className,
}: SegmentadoProps<T>) {
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

  const nenhuma = !opcoes.some((o) => o.valor === valor);

  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      onKeyDown={aoTeclar}
      className={cn('flex w-full gap-0.5 rounded-lg bg-surface-2 p-0.5', className)}
    >
      {opcoes.map((o, idx) => {
        const escolhida = o.valor === valor;
        return (
          <button
            key={o.valor}
            ref={(el) => { refs.current[o.valor] = el; }}
            type="button"
            role="radio"
            aria-checked={escolhida}
            aria-label={o.rotulo}
            title={o.dica ?? (soIcone ? o.rotulo : undefined)}
            tabIndex={escolhida || (nenhuma && idx === 0) ? 0 : -1}
            onClick={() => onChange(o.valor)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center rounded-md font-semibold transition-all',
              empilhado ? 'flex-col gap-1 px-1 py-2 text-badge' : 'h-9 gap-1.5 px-2 text-caption',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              escolhida
                ? 'bg-surface text-fg-token shadow-repouso'
                : 'text-fg-muted-token hover:text-fg-token'
            )}
          >
            {o.icone && <span className="flex shrink-0 items-center" aria-hidden>{o.icone}</span>}
            {!soIcone && <span className="truncate">{o.rotulo}</span>}
          </button>
        );
      })}
    </div>
  );
}

Segmentado.displayName = 'Segmentado';

export default Segmentado;
