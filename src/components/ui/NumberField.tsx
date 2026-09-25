import React, { useEffect, useId, useState } from 'react';
import { cn } from '../../utils/cn';

export interface NumberFieldProps {
  rotulo: string;
  valor: number;
  onMudar: (valor: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unidade depois do campo: "mm", "dias". */
  sufixo?: string;
  'data-testid'?: string;
  className?: string;
}

/**
 * Campo numérico que deixa digitar. Corrigir a faixa a cada tecla impedia
 * escrever "33" num campo de mínimo 15 (o "3" virava 15 antes do segundo
 * dígito). A faixa vale ao sair do campo ou no Enter.
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  rotulo, valor, onMudar, min = 0, max = 1_000_000, step = 1, sufixo, className, ...resto
}) => {
  const id = useId();
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => { setTexto(String(valor)); }, [valor]);
  const confirmar = () => {
    const n = Number(texto.replace(',', '.'));
    const corrigido = texto.trim() !== '' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : valor;
    setTexto(String(corrigido));
    if (corrigido !== valor) onMudar(corrigido);
  };
  return (
    <div className={cn('flex items-center justify-between gap-3 text-sm', className)}>
      <label htmlFor={id} className="text-fg-muted-token">{rotulo}</label>
      <span className="flex items-center gap-1.5">
        <input
          id={id}
          type="number" inputMode="decimal" min={min} max={max} step={step}
          className="controle h-9 w-24 px-2 text-right tabular-nums"
          value={texto}
          data-testid={resto['data-testid']}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }}
        />
        {sufixo && <span className="whitespace-nowrap text-xs text-fg-muted-token">{sufixo}</span>}
      </span>
    </div>
  );
};
