/**
 * FormChecklist — o que falta para salvar, visível o tempo todo.
 *
 * O formulário de produto só contava a verdade quando você clicava em salvar, e
 * devolvia um toast. Passar a pular para a aba do erro ajudou, mas ainda é
 * diagnóstico DEPOIS da tentativa: o botão continua sendo uma roleta.
 *
 * O checklist inverte a ordem. Cada requisito vira uma linha com ✓ ou !,
 * atualizada enquanto se digita. Você vê o que falta antes de tentar, e salvar
 * deixa de surpreender.
 *
 * DUAS REGRAS QUE PARECEM DETALHE E NÃO SÃO:
 *
 * 1. O estado tem TEXTO, não só cor. Verde e vermelho são a mesma coisa para
 *    quem não distingue as duas, e não existem para leitor de tela.
 *
 * 2. Quando está tudo certo, a seção NÃO some — ela muda de mensagem. Sumir
 *    tira a confirmação justo na hora em que ela vale mais: antes de apertar
 *    salvar.
 */
import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';

export interface ItemDeChecklist {
  rotulo: string;
  ok: boolean;
  /** Leva ao campo. Saber o que falta sem saber onde é meio caminho. */
  onIr?: () => void;
}

export interface FormChecklistProps {
  itens: ItemDeChecklist[];
  titulo?: string;
  className?: string;
}

export const FormChecklist: React.FC<FormChecklistProps> = ({
  itens,
  titulo = 'Para salvar',
  className,
}) => {
  if (!itens.length) return null;

  const prontos = itens.filter((i) => i.ok).length;
  const tudoPronto = prontos === itens.length;

  return (
    <section
      aria-label={titulo}
      className={cn('rounded border border-border-token bg-surface p-4', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="overline">{titulo}</h3>
        <span
          className={cn(
            'text-caption font-semibold tabular-nums',
            tudoPronto ? 'text-[var(--success)]' : 'text-fg-muted-token'
          )}
        >
          {tudoPronto ? 'Tudo pronto' : `${prontos} de ${itens.length}`}
        </span>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {itens.map((item) => {
          const conteudo = (
            <>
              {item.ok ? (
                <CheckCircleIcon
                  className="h-4 w-4 shrink-0 text-[var(--success)]"
                  aria-hidden
                />
              ) : (
                <ExclamationCircleIcon
                  className="h-4 w-4 shrink-0 text-[var(--warning)]"
                  aria-hidden
                />
              )}
              <span className={cn('min-w-0', item.ok ? 'text-fg-muted-token' : 'text-fg-token')}>
                {item.rotulo}
              </span>
              {/* O estado em palavra: cor não chega a quem não a vê. */}
              <span className="sr-only">{item.ok ? '— concluído' : '— pendente'}</span>
            </>
          );

          // Item concluído não vira botão: não há para onde ir consertar o que
          // já está certo.
          const clicavel = !item.ok && typeof item.onIr === 'function';

          return (
            <li key={item.rotulo}>
              {clicavel ? (
                <button
                  type="button"
                  onClick={item.onIr}
                  className="flex w-full items-center gap-2 rounded text-left text-caption transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {conteudo}
                  <span className="ml-auto shrink-0 text-brand-ink" aria-hidden>→</span>
                </button>
              ) : (
                <span className="flex items-center gap-2 text-caption">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

FormChecklist.displayName = 'FormChecklist';

export default FormChecklist;
