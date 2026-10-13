/**
 * Deslizador — número que se ajusta olhando o resultado (corte do "ver mais",
 * por exemplo): arrasta e a prévia acompanha. Para número exato que se digita,
 * use `NumberField`.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export interface DeslizadorProps {
  rotulo: string;
  valor: number;
  onMudar: (valor: number) => void;
  min?: number;
  max?: number;
  passo?: number;
  /** Texto do valor (ex.: 0 → "Automático"). */
  formatar?: (valor: number) => string;
  className?: string;
}

export const Deslizador: React.FC<DeslizadorProps> = ({
  rotulo,
  valor,
  onMudar,
  min = 0,
  max = 100,
  passo = 1,
  formatar = String,
  className,
}) => {
  const texto = formatar(valor);
  const fracao = max > min ? Math.min(1, Math.max(0, (valor - min) / (max - min))) : 0;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <input
        type="range"
        aria-label={rotulo}
        aria-valuetext={texto}
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onMudar(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{
          background: `linear-gradient(to right, var(--brand) ${fracao * 100}%, var(--surface-2) ${fracao * 100}%)`,
        }}
      />
      <span className="w-24 shrink-0 text-right text-caption font-semibold tabular-nums text-fg-token">{texto}</span>
    </div>
  );
};

Deslizador.displayName = 'Deslizador';

export default Deslizador;
