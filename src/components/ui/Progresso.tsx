import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressoProps {
  /** 0–100; fora disso é cortado. */
  pct: number;
  rotulo: string;
  /** Mostra "70%" ao lado da barra. */
  mostrarValor?: boolean;
  className?: string;
}

/** Barra de progresso na cor da marca. Uma só — Conquistas tinha a dela. */
export const Progresso: React.FC<ProgressoProps> = ({ pct, rotulo, mostrarValor = false, className }) => {
  const valor = Math.round(Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0)));
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-2"
      >
        <div className="h-full rounded-pill bg-brand transition-[width] duration-500" style={{ width: `${valor}%` }} />
      </div>
      {mostrarValor && <span className="text-caption tabular-nums text-fg-muted-token">{valor}%</span>}
    </div>
  );
};
