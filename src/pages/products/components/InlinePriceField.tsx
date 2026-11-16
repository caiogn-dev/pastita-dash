import React, { useEffect, useState } from 'react';

import { formatCurrency, lerDinheiro } from '../../../utils/formatters';

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
    <div className="flex w-28 items-center rounded border border-border-token bg-surface focus-within:ring-2 focus-within:ring-brand">
      <span className="pl-2 text-xs text-fg-muted-token">R$</span>
      <input
        aria-label="preço"
        inputMode="numeric"
        autoComplete="off"
        className="w-full min-w-0 bg-transparent px-1.5 py-1 text-right tabular-nums text-fg-token outline-none"
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
