import React from 'react';
import { Switch } from '../../components/ui/Switch';

/**
 * Interruptor com o rótulo do lado — o único liga/desliga do formulário.
 * Antes, "Brinde" era interruptor e "Produto em destaque", "Controlar
 * estoque" e "Permitir venda sem estoque" eram caixinhas nativas azuis (13/11).
 * O rótulo inteiro é clicável.
 */
const LigaDesliga: React.FC<{
  rotulo: string;
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  desabilitado?: boolean;
}> = ({ rotulo, ligado, onMudar, desabilitado }) => {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <Switch ligado={ligado} onMudar={onMudar} rotulo={rotulo} desabilitado={desabilitado} />
      <span
        className="cursor-pointer select-none text-sm text-fg-token"
        onClick={() => !desabilitado && onMudar(!ligado)}
      >
        {rotulo}
      </span>
    </div>
  );
};

export default LigaDesliga;
