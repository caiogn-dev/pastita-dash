import React from 'react';
import { Campo, Input, Switch } from '../../components/ui';
import { DIAS_CURTOS, type RegrasDeVenda } from './regrasDeVenda';

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
        <Campo rotulo="Vende das">
          <Input type="time" value={valor.de ?? ''} onChange={(e) => mudar({ de: e.target.value })} />
        </Campo>
        <Campo rotulo="Até">
          <Input type="time" value={valor.ate ?? ''} onChange={(e) => mudar({ ate: e.target.value })} />
        </Campo>
        <Campo rotulo="Mínimo por pedido">
          <Input
            type="number" inputMode="numeric" min={1} max={999} placeholder="1"
            className="tabular-nums" value={valor.minimo ?? ''}
            onChange={(e) => mudar({ minimo: numero(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Máximo por pedido">
          <Input
            type="number" inputMode="numeric" min={1} max={999} placeholder="Sem limite"
            className="tabular-nums" value={valor.maximo ?? ''}
            onChange={(e) => mudar({ maximo: numero(e.target.value) })}
          />
        </Campo>
      </div>

      <div className="flex items-center gap-2">
        <Switch ligado={!!valor.so_retirada} onMudar={(v) => mudar({ so_retirada: v })} rotulo="Só retirada na loja" />
        <span className="text-sm">Só retirada na loja</span>
      </div>
    </fieldset>
  );
};

export default RegrasDeVendaCampos;
