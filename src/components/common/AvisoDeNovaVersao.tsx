import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNovaVersao } from '../../hooks/useNovaVersao';

/** Faixa fixa no rodapé: "Nova versão do painel" com o botão que recarrega. */
export const AvisoDeNovaVersao: React.FC = () => {
  const temNova = useNovaVersao();
  if (!temNova) return null;
  return (
    <div role="status" className="superficie fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 px-4 py-2 text-sm text-fg-token shadow-hover">
      <span>Nova versão do painel</span>
      <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1 font-medium text-on-brand">
        <ArrowPathIcon className="h-4 w-4" /> Atualizar
      </button>
    </div>
  );
};

export default AvisoDeNovaVersao;
