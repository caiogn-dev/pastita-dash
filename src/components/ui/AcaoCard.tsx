import React from 'react';
import { cn } from '../../utils/cn';

export interface AcaoCardProps {
  titulo: string;
  /** A consequência: o que acontece ao clicar. */
  descricao: string;
  icone?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  desabilitado?: boolean;
  className?: string;
}

/** Cartão-botão de ação ("Nova campanha", "Importar cardápio"). Ícone no chip
 *  dourado suave, sem cor por cartão: a cor era decoração, não informação. */
export const AcaoCard: React.FC<AcaoCardProps> = ({ titulo, descricao, icone: Icone, onClick, desabilitado = false, className }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={desabilitado}
    className={cn(
      'superficie-alta flex w-full items-start gap-4 p-4 text-left transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
  >
    {Icone && (
      <span className="rounded-lg bg-brand-soft p-2.5 text-brand-ink" aria-hidden>
        <Icone className="h-5 w-5" />
      </span>
    )}
    <span className="min-w-0">
      <span className="block font-semibold text-fg-token">{titulo}</span>
      <span className="block text-caption text-fg-muted-token">{descricao}</span>
    </span>
  </button>
);
