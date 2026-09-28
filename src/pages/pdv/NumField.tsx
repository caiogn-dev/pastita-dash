import React, { useEffect, useState } from 'react';

/** Campo numérico em mm: guarda texto local e só corrige a faixa ao sair —
 *  corrigir a cada tecla impedia digitar "33" com mínimo 15. */
export const NumField: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; testId?: string;
}> = ({ label, value, onChange, min = 0, max = 300, step = 0.5, suffix = 'mm', testId }) => {
  // Texto local: corrigir a faixa a cada tecla impedia digitar. Com mínimo 15,
  // o "3" de "33" virava 15 antes do segundo dígito. A faixa vale ao sair.
  const [texto, setTexto] = useState(String(value));
  useEffect(() => { setTexto(String(value)); }, [value]);
  const confirmar = () => {
    const n = Number(texto.replace(',', '.'));
    const corrigido = Number.isFinite(n) && texto.trim() !== '' ? Math.min(max, Math.max(min, n)) : value;
    setTexto(String(corrigido));
    if (corrigido !== value) onChange(corrigido);
  };
  const id = `num-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <label htmlFor={id} className="text-fg-muted-token">{label}</label>
      <span className="flex items-center gap-1.5">
        <input
          id={id}
          type="number" inputMode="decimal" min={min} max={max} step={step}
          className="controle h-9 w-24 px-2 text-right tabular-nums"
          value={texto}
          data-testid={testId}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }}
        />
        {suffix && <span className="text-fg-muted-token text-xs whitespace-nowrap">{suffix}</span>}
      </span>
    </div>
  );
};

export default NumField;
