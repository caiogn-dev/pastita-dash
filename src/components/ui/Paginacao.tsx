import React from 'react';

import { cn } from '../../utils/cn';

export interface PaginacaoProps {
  /** 1-based, como o `?page=` do backend. */
  pagina: number;
  porPagina: number;
  total: number;
  onPagina: (pagina: number) => void;
  /** O que está sendo contado: "cupons", "pedidos". Padrão: "itens". */
  rotulo?: string;
  className?: string;
}

const botao =
  'rounded-lg border border-border-token bg-surface px-3 py-1.5 text-sm font-medium ' +
  'text-fg-token transition-colors hover:bg-surface-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

/**
 * As páginas a desenhar: pontas sempre, vizinhança da atual, reticências no
 * meio. Cinquenta páginas numeradas viram uma régua ilegível.
 */
const numeros = (pagina: number, paginas: number): (number | '…')[] => {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1);

  const saida: (number | '…')[] = [1];
  if (pagina > 3) saida.push('…');
  for (let i = Math.max(2, pagina - 1); i <= Math.min(paginas - 1, pagina + 1); i++) {
    saida.push(i);
  }
  if (pagina < paginas - 2) saida.push('…');
  saida.push(paginas);
  return saida;
};

/**
 * O paginador do painel.
 *
 * Ele sempre mostra o TOTAL, mesmo quando não há o que paginar: uma lista que
 * não diz quantos itens tem faz o operador acreditar que a plataforma perdeu o
 * que está fora da primeira página.
 */
export const Paginacao: React.FC<PaginacaoProps> = ({
  pagina,
  porPagina,
  total,
  onPagina,
  rotulo = 'itens',
  className,
}) => {
  if (total <= 0) return null;

  const paginas = Math.ceil(total / porPagina);
  const primeiro = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, total);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-sm text-fg-muted-token">
        {paginas > 1 ? `${primeiro}–${ultimo} de ${total}` : `${total} ${rotulo}`}
      </p>

      {paginas > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={botao}
            onClick={() => onPagina(pagina - 1)}
            disabled={pagina <= 1}
          >
            Anterior
          </button>
          {numeros(pagina, paginas).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-1 text-sm text-fg-muted-token">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                aria-label={`Página ${n}`}
                // `aria-current` e não só a cor: quem usa leitor de tela
                // precisa saber onde está sem enxergar o destaque.
                aria-current={n === pagina ? 'page' : undefined}
                onClick={() => onPagina(n)}
                className={cn(
                  'h-8 min-w-8 rounded-lg text-sm font-medium transition-colors',
                  n === pagina
                    // `text-on-brand`, não `text-white`: branco sobre o ouro
                    // da marca dá 2.40:1, e a AA pede 4.5:1.
                    ? 'bg-brand text-on-brand'
                    : 'text-fg-muted-token hover:bg-surface-2 hover:text-fg-token',
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            className={botao}
            onClick={() => onPagina(pagina + 1)}
            disabled={pagina >= paginas}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

Paginacao.displayName = 'Paginacao';
