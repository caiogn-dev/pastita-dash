/**
 * Uma linha do painel de propriedades: rótulo curto em cima (com o valor atual
 * à direita, quando ajuda) e o controle embaixo. O ponto marca o que mudou e
 * ainda não foi salvo.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export interface PropriedadeProps {
  rotulo: string;
  /** Valor atual por extenso, à direita do rótulo. */
  valor?: React.ReactNode;
  mudou?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Propriedade: React.FC<PropriedadeProps> = ({ rotulo, valor, mudou = false, children, className }) => (
  <div className={cn('flex flex-col gap-2', className)}>
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-caption font-semibold text-fg-muted-token">
        {rotulo}
        {mudou && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-brand"
            aria-label="Alterado, ainda não salvo"
            title="Alterado, ainda não salvo"
          />
        )}
      </span>
      {valor !== undefined && <span className="text-caption text-fg-token">{valor}</span>}
    </div>
    {children}
  </div>
);

Propriedade.displayName = 'Propriedade';

export default Propriedade;
