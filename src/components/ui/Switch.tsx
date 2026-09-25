import React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  /** Nome acessível: o que liga e desliga ("Programa ativo"). */
  rotulo: string;
  desabilitado?: boolean;
  className?: string;
}

/**
 * Interruptor para estados de efeito imediato e óbvio (ligado/desligado).
 * Para escolhas com consequência que a pessoa precisa entender antes, use
 * `ChoiceCards`. Havia um `Toggle` só na tela de Configurações; agora é um.
 */
export const Switch: React.FC<SwitchProps> = ({ ligado, onMudar, rotulo, desabilitado = false, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ligado}
    aria-label={rotulo}
    disabled={desabilitado}
    onClick={() => onMudar(!ligado)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border border-transparent transition-colors',
      ligado ? 'bg-brand' : 'bg-surface-2 border-border-token',
      desabilitado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    )}
  >
    <span
      aria-hidden
      className={cn(
        'inline-block h-5 w-5 rounded-pill shadow-repouso transition-transform',
        ligado ? 'translate-x-5 bg-on-brand' : 'translate-x-0.5 bg-fg-muted-token',
      )}
    />
  </button>
);
