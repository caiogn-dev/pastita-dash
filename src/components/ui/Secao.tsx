import React from 'react';
import { cn } from '../../utils/cn';

export interface SecaoProps {
  /** Em frase: "Como o cliente ganha", não "COMO O CLIENTE GANHA". */
  titulo: string;
  descricao?: string;
  /** Contador ao lado do título: "(3)". */
  contador?: number;
  acoes?: React.ReactNode;
  children?: React.ReactNode;
  /** Sem superfície: só o cabeçalho, para seções dentro de um Card. */
  plana?: boolean;
  className?: string;
}

/**
 * A unidade de página do painel: cabeçalho (título em frase + o que a seção
 * faz + ações) e corpo, numa superfície. Uma página é uma sequência de Secao
 * dentro de um PageShell. Sem eyebrow em caixa alta, sem número 01/02.
 */
export const Secao: React.FC<SecaoProps> = ({ titulo, descricao, contador, acoes, children, plana = false, className }) => (
  <section className={cn(plana ? '' : 'superficie', className)} aria-label={titulo}>
    <header className={cn('flex flex-wrap items-start justify-between gap-3', plana ? 'mb-3' : 'px-5 py-4 border-b border-border-token')}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-fg-token">
          {titulo}
          {typeof contador === 'number' && <span className="ml-1.5 font-normal text-fg-muted-token">({contador})</span>}
        </h2>
        {descricao && <p className="mt-0.5 text-caption text-fg-muted-token">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
    {children && <div className={plana ? '' : 'px-5 py-4'}>{children}</div>}
  </section>
);
