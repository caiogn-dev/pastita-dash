import React from 'react';
import { Campo, Input } from '../../ui';
import { cn } from '../../../utils/cn';
import { faixasDaData } from './faixasDaData';
import { useAgendaDaLoja } from './useAgendaDaLoja';

/**
 * Data + faixa de agendamento, com as faixas REAIS da loja (as mesmas do
 * cardápio). Usado no novo pedido e na edição.
 */
export function SeletorDeFaixa({
  storeSlug,
  data,
  onData,
  faixa,
  onFaixa,
  erro,
}: {
  storeSlug: string | null | undefined;
  data: string;
  onData: (v: string) => void;
  faixa: string;
  onFaixa: (v: string) => void;
  erro?: string;
}) {
  const { agenda, carregando } = useAgendaDaLoja(storeSlug);
  const faixas = faixasDaData(agenda, data, faixa);

  return (
    <div className="space-y-3">
      <Campo rotulo="Data do agendamento">
        <Input size="sm" type="date" value={data} onChange={(e) => onData(e.target.value)} />
      </Campo>
      <Campo rotulo="Faixa" erro={erro}>
        <div role="radiogroup" aria-label="Faixa" className="flex flex-wrap gap-1.5">
          {faixas.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={faixa === f}
              onClick={() => onFaixa(f)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                faixa === f
                  ? 'bg-brand border-brand text-on-brand'
                  : 'border-border-token text-fg-token hover:bg-surface-2',
              )}
            >
              {f.replace('-', '–')}
            </button>
          ))}
          {!faixas.length && (
            <span className="text-xs text-fg-muted-token">
              {carregando ? 'Carregando faixas…' : 'Loja sem horário de funcionamento configurado'}
            </span>
          )}
        </div>
      </Campo>
    </div>
  );
}
