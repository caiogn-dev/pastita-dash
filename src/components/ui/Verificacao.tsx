import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

export interface VerificacaoProps {
  ok: boolean;
  rotulo: string;
  /** O que fazer quando não está ok. */
  detalhe?: string;
  className?: string;
}

/** Linha de checagem (webhook, token, impressora): ícone + rótulo + o que fazer. */
export const Verificacao: React.FC<VerificacaoProps> = ({ ok, rotulo, detalhe, className }) => (
  <div className={cn('flex items-start gap-2 text-sm', className)}>
    {ok
      ? <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-success-token" aria-hidden />
      : <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger-token" aria-hidden />}
    <div className="min-w-0">
      <span className={ok ? 'text-success-token' : 'text-danger-token'}>{rotulo}</span>
      {detalhe && <p className="text-caption text-fg-muted-token">{detalhe}</p>}
    </div>
  </div>
);
