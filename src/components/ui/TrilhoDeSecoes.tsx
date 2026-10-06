/**
 * TrilhoDeSecoes — chips com contagem, fixo no topo, para pular entre as
 * partes de uma página longa.
 *
 * 06/10: no Cardápio (20 categorias na Cê) só havia um seletor que FILTRAVA;
 * para chegar em "Bebidas" era rolar. O trilho fica preso ao topo enquanto a
 * página rola e marca a seção que está na tela (ver `useSecaoVisivel`).
 */
import React, { useEffect, useRef } from 'react';

import { cn } from '../../utils/cn';

export interface ItemDoTrilho {
  id: string;
  rotulo: string;
  contador?: number;
}

export interface TrilhoDeSecoesProps {
  itens: ItemDoTrilho[];
  ativo: string | null;
  onEscolher: (id: string) => void;
  /** Nome da navegação para leitor de tela (ex.: "Categorias"). */
  rotulo: string;
  className?: string;
}

export const TrilhoDeSecoes: React.FC<TrilhoDeSecoesProps> = ({ itens, ativo, onEscolher, rotulo, className }) => {
  const trilho = useRef<HTMLDivElement>(null);

  // O chip ativo não pode sumir para fora do trilho quando a página rola.
  useEffect(() => {
    if (!ativo || !trilho.current) return;
    const chip = trilho.current.querySelector<HTMLElement>(`[data-secao="${CSS.escape(ativo)}"]`);
    chip?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [ativo]);

  if (!itens.length) return null;

  return (
    <nav
      aria-label={rotulo}
      className={cn('sticky top-0 z-20 -mx-1 mb-4 bg-bg-token px-1 py-2', className)}
    >
      <div ref={trilho} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {itens.map((item) => {
          const eAtivo = item.id === ativo;
          return (
            <button
              key={item.id}
              type="button"
              data-secao={item.id}
              aria-current={eAtivo ? 'true' : undefined}
              onClick={() => onEscolher(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                eAtivo
                  ? 'border-transparent bg-brand text-on-brand'
                  : 'border-[var(--border)] text-fg-muted-token hover:text-fg-token',
              )}
            >
              <span className="whitespace-nowrap">{item.rotulo}</span>
              {item.contador !== undefined && (
                <span className={cn('text-xs tabular-nums', eAtivo ? 'opacity-80' : 'text-fg-muted-token')}>
                  {item.contador}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TrilhoDeSecoes;
