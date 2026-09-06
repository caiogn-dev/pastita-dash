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
          <span className="text-sm text-fg-muted-token">
            {pagina} / {paginas}
          </span>
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
