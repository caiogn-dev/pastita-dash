/**
 * Pausas programadas: "fechado sábado para inventário", "volta às 14h, faltou
 * gás". Fecham a loja no intervalo e se desfazem sozinhas — o dono não precisa
 * lembrar de reabrir. O cardápio mostra o fim e o motivo.
 */
import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Input } from '../../components/ui';
import { problemaDaPausa, type Pausa } from './horarios';

interface Props {
  pausas: Pausa[];
  onChange: (novas: Pausa[]) => void;
}

export const PausasProgramadas: React.FC<Props> = ({ pausas, onChange }) => {
  const mudar = (i: number, parcial: Partial<Pausa>) =>
    onChange(pausas.map((p, j) => (j === i ? { ...p, ...parcial } : p)));
  return (
    <div className="flex flex-col gap-3">
      {pausas.map((p, i) => {
        const problema = problemaDaPausa(p);
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="datetime-local" size="sm" label="Início" className="w-52"
                value={p.inicio} onChange={(e) => mudar(i, { inicio: e.target.value })}
              />
              <Input
                type="datetime-local" size="sm" label="Fim" className="w-52"
                value={p.fim} onChange={(e) => mudar(i, { fim: e.target.value })}
              />
              <div className="min-w-0 flex-1 basis-48">
                <Input
                  size="sm" label="Motivo" maxLength={255} placeholder="Inventário"
                  value={p.motivo} onChange={(e) => mudar(i, { motivo: e.target.value })}
                />
              </div>
              <button
                type="button"
                aria-label={`Remover pausa ${i + 1}`}
                onClick={() => onChange(pausas.filter((_, j) => j !== i))}
                className="mb-1 rounded p-1.5 text-fg-muted-token hover:bg-surface-2 hover:text-danger-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <TrashIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {problema && (p.inicio || p.fim) && <p role="alert" className="text-xs text-danger-token">{problema}</p>}
          </div>
        );
      })}
      <div>
        <Button
          variant="outline" size="sm"
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => onChange([...pausas, { inicio: '', fim: '', motivo: '' }])}
        >
          Adicionar pausa
        </Button>
      </div>
    </div>
  );
};
