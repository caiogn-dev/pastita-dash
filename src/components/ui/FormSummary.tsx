/**
 * FormSummary — espelho do que já foi preenchido, ao lado do formulário.
 *
 * Num formulário longo (o de produto tem seis abas) você marca uma coisa na
 * aba Preços, vai para Estoque, volta para Mídia, e ao chegar em salvar já não
 * lembra o que escolheu lá atrás. A conferência custa reabrir cada aba.
 *
 * O resumo é a resposta curta: quatro a seis linhas de `rótulo: valor`, sempre
 * visíveis. Não substitui o formulário — confirma.
 *
 * Campo não preenchido aparece com um travessão em vez de sumir: uma linha
 * ausente lê como "não existe esse campo", e uma linha com "—" lê como "existe
 * e está vazio". A segunda é a verdade.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export interface LinhaDeResumo {
  rotulo: string;
  valor?: React.ReactNode;
}

export interface FormSummaryProps {
  linhas: LinhaDeResumo[];
  titulo?: string;
  className?: string;
}

export const FormSummary: React.FC<FormSummaryProps> = ({
  linhas,
  titulo = 'Resumo',
  className,
}) => {
  if (!linhas.length) return null;

  return (
    <section
      aria-label={titulo}
      className={cn('rounded border border-border-token bg-surface p-4', className)}
    >
      <h3 className="overline">{titulo}</h3>
      <dl className="mt-2.5 space-y-1.5">
        {linhas.map((l) => {
          const vazio =
            l.valor === undefined || l.valor === null || l.valor === '' || l.valor === 0;
          return (
            <div key={l.rotulo} className="flex items-baseline justify-between gap-3 text-caption">
              <dt className="shrink-0 text-fg-muted-token">{l.rotulo}</dt>
              <dd
                className={cn(
                  'min-w-0 truncate text-right font-medium',
                  vazio ? 'text-fg-muted-token' : 'text-fg-token'
                )}
              >
                {vazio ? '—' : l.valor}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};

FormSummary.displayName = 'FormSummary';

export default FormSummary;
