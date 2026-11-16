import React, { useEffect, useState } from 'react';

import { formatCurrency, lerDinheiro } from '../../../utils/formatters';
import { Input } from '../../../components/ui/input';

interface Props {
  value: number;
  onCommit: (next: number) => void;
}

const LIMITE_EM_CENTAVOS = 99_999_999_99;

/**
 * Preço na linha da lista, no mesmo padrão do CampoDeDinheiro: mostra 39,90 e
 * digitar enche pelos centavos ("3990" vira 39,90). Grava ao sair do campo ou
 * no Enter; Esc desfaz.
 */
export const InlinePriceField: React.FC<Props> = ({ value, onCommit }) => {
  const [rascunho, setRascunho] = useState<number | null>(value);

  useEffect(() => { setRascunho(value); }, [value]);

  const digitar = (bruto: string) => {
    const digitos = bruto.replace(/\D/g, '').replace(/^0+/, '');
    setRascunho(digitos ? Math.min(Number(digitos), LIMITE_EM_CENTAVOS) / 100 : null);
  };

  const colar = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const colado = e.clipboardData.getData('text').replace(/[^\d.,-]/g, '');
    if (!colado) return;
    e.preventDefault();
    setRascunho(Math.round(lerDinheiro(colado) * 100) / 100);
  };

  const gravar = () => {
    if (rascunho === null || Number.isNaN(rascunho)) return setRascunho(value);
    if (rascunho !== value) onCommit(rascunho);
  };

  return (
    <div className="w-28">
      <Input
        size="sm"
        aria-label="preço"
        inputMode="numeric"
        autoComplete="off"
        leftElement={<span className="text-xs font-medium">R$</span>}
        className="pl-8 pr-2 text-right tabular-nums"
        value={rascunho === null ? '' : formatCurrency(rascunho, { semSimbolo: true })}
        onChange={(e) => digitar(e.target.value)}
        onPaste={colar}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setRascunho(value);
        }}
      />
    </div>
  );
};
