/**
 * EmptyState — tela vazia é oportunidade, não erro.
 *
 * Duas ausências diferentes que hoje o painel trata igual (isto é: não trata):
 *
 *   `vazio`    não há dados AINDA. O inbox sem conversa selecionada deixa 81%
 *              da tela preta, sem uma palavra explicando o que fazer.
 *   `ativacao` a feature EXISTE e está desligada. A Fidelidade desligada não
 *              diz o que faria se estivesse ligada — e ninguém liga aquilo que
 *              não entende. Aqui a tela vende: estado, promessa, benefícios,
 *              botão.
 *
 * Os benefícios são cards curtos de propósito. Parágrafo ninguém lê; quatro
 * frases de sete palavras, lê.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyStateBeneficio {
  titulo: string;
  descricao: string;
  icone?: React.ReactNode;
}

export interface EmptyStateProps {
  variante?: 'vazio' | 'ativacao';
  /** Selo de estado, só na variante ativação. Ex.: "Programa inativo". */
  estado?: string;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  /** Cartões de benefício — a parte que vende a feature. */
  beneficios?: EmptyStateBeneficio[];
  /** Ilustração ou ícone grande, só na variante vazio. */
  icone?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variante = 'vazio',
  estado,
  titulo,
  descricao,
  acao,
  beneficios,
  icone,
  className,
}) => {
  if (variante === 'ativacao') {
    return (
      <section
        className={cn(
          'rounded border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-6 sm:p-8',
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {estado && (
              <p className="overline flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                {estado}
              </p>
            )}
            <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight text-fg-token sm:text-2xl">
              {titulo}
            </h2>
            {descricao && <p className="mt-2 text-body text-fg-muted-token">{descricao}</p>}
          </div>
          {acao && <div className="flex items-center gap-2">{acao}</div>}
        </div>

        {beneficios && beneficios.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {beneficios.map((b) => (
              <li
                key={b.titulo}
                className="rounded border border-border-token bg-surface p-4"
              >
                {b.icone && <div className="mb-2 text-brand-ink">{b.icone}</div>}
                <p className="text-body font-semibold text-fg-token">{b.titulo}</p>
                <p className="mt-1 text-caption text-fg-muted-token">{b.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className
      )}
    >
      {icone && <div className="text-fg-muted-token opacity-60">{icone}</div>}
      <h2 className="text-lead font-semibold text-fg-token">{titulo}</h2>
      {descricao && (
        <p className="max-w-sm text-body text-fg-muted-token">{descricao}</p>
      )}
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;
