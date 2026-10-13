/**
 * Barra de alterações — um "Salvar" para a página inteira, que só aparece
 * quando há o que salvar. É o padrão do editor de tema da Shopify: você mexe,
 * vê o efeito na prévia, e a barra lembra que nada foi gravado ainda.
 *
 * Antes o Storefront tinha "Salvar exibição" no meio da página e "Salvar
 * storefront" no fim: mexia-se nos dois, salvava-se um, e o outro se perdia
 * ao sair da tela.
 */
import React from 'react';

import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface BarraDeAlteracoesProps {
  quantidade: number;
  salvando?: boolean;
  onSalvar: () => void;
  onDescartar: () => void;
  className?: string;
}

export const BarraDeAlteracoes: React.FC<BarraDeAlteracoesProps> = ({
  quantidade,
  salvando = false,
  onSalvar,
  onDescartar,
  className,
}) => {
  if (quantidade <= 0) return null;
  return (
    <div
      role="region"
      aria-label="Alterações não salvas"
      className={cn(
        'superficie-alta sticky bottom-4 z-20 flex items-center justify-between gap-3 px-4 py-3',
        className
      )}
    >
      <span className="flex items-center gap-2 text-body font-semibold text-fg-token">
        <span className="inline-block h-2 w-2 rounded-full bg-brand" aria-hidden />
        {quantidade} {quantidade === 1 ? 'alteração' : 'alterações'}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onDescartar} disabled={salvando}>
          Descartar
        </Button>
        <Button onClick={onSalvar} isLoading={salvando} disabled={salvando}>
          Salvar
        </Button>
      </div>
    </div>
  );
};

BarraDeAlteracoes.displayName = 'BarraDeAlteracoes';

export default BarraDeAlteracoes;
