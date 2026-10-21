import React from 'react';
import { DIAS_CURTOS, type RegrasDeVenda } from './regrasDeVenda';

const CAMPO =
  'w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand';
const TODOS = [0, 1, 2, 3, 4, 5, 6];

interface Props {
  valor: RegrasDeVenda;
  onChange: (regras: RegrasDeVenda) => void;
}

const numero = (texto: string) => (texto === '' ? undefined : Number(texto));

/** Quando vende, como sai e quanto por pedido. Tudo opcional. */
export const RegrasDeVendaCampos: React.FC<Props> = ({ valor, onChange }) => {
  const dias = valor.dias ?? TODOS;
  const mudar = (parcial: Partial<RegrasDeVenda>) => onChange({ ...valor, ...parcial });
  const alternarDia = (d: number) =>
    mudar({ dias: dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort((a, b) => a - b) });

  return (
    <fieldset className="superficie-2 space-y-4 p-3">
      <legend className="text-sm font-medium text-fg-token">Regras de venda</legend>

      <div role="group" aria-label="Dias de venda" className="flex flex-wrap gap-1.5">
        {DIAS_CURTOS.map((rotulo, d) => (
          <button
            key={rotulo}
            type="button"
            aria-pressed={dias.includes(d)}
            onClick={() => alternarDia(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              dias.includes(d)
                ? 'border-brand-ink bg-brand-ink text-fg-on-brand'
                : 'border-border-token text-fg-muted-token'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-token" htmlFor="venda-de">Vende das</label>
          <input id="venda-de" type="time" className={CAMPO} value={valor.de ?? ''} onChange={(e) => mudar({ de: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-token" htmlFor="venda-ate">Até</label>
          <input id="venda-ate" type="time" className={CAMPO} value={valor.ate ?? ''} onChange={(e) => mudar({ ate: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-token" htmlFor="venda-minimo">Mínimo por pedido</label>
          <input
            id="venda-minimo" type="number" inputMode="numeric" min={1} max={999} placeholder="1"
            className={`${CAMPO} tabular-nums`} value={valor.minimo ?? ''}
            onChange={(e) => mudar({ minimo: numero(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-token" htmlFor="venda-maximo">Máximo por pedido</label>
          <input
            id="venda-maximo" type="number" inputMode="numeric" min={1} max={999} placeholder="Sem limite"
            className={`${CAMPO} tabular-nums`} value={valor.maximo ?? ''}
            onChange={(e) => mudar({ maximo: numero(e.target.value) })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!valor.so_retirada}
          onChange={(e) => mudar({ so_retirada: e.target.checked })}
          className="rounded border-border-token text-brand-ink focus:ring-brand"
        />
        <span className="text-sm">Só retirada na loja</span>
      </label>
    </fieldset>
  );
};

export default RegrasDeVendaCampos;
