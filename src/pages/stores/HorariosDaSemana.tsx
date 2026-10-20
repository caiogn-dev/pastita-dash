/**
 * Grade da semana com um ou mais turnos por dia (08–13 e 15–17).
 *
 * Só desenha e devolve o novo `operating_hours`; quem grava é o Salvar único
 * da página de configurações.
 */
import React from 'react';
import { PlusIcon, XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui';
import { cn } from '../../utils/cn';
import {
  comTurnos, copiarParaOsOutrosDias, problemaDosTurnos, turnosDoDia,
  type DayHours, type OperatingHours, type Turno,
} from './horarios';

interface Props {
  dias: Array<{ key: string; label: string }>;
  horas: OperatingHours;
  padrao: DayHours;
  onChange: (novo: OperatingHours) => void;
}

export const HorariosDaSemana: React.FC<Props> = ({ dias, horas, padrao, onChange }) => (
  <ul className="divide-y divide-border-token">
    {dias.map((day) => {
      const h = horas[day.key] || padrao;
      const gravar = (dia: DayHours) => onChange({ ...horas, [day.key]: dia });
      const turnos = turnosDoDia(h);
      const mudarTurno = (i: number, parcial: Partial<Turno>) =>
        gravar(comTurnos(h, turnos.map((t, j) => (j === i ? { ...t, ...parcial } : t))));
      const problema = h.is_open ? problemaDosTurnos(turnos) : null;
      return (
        <li key={day.key} className="flex min-h-[52px] flex-wrap items-start gap-3 py-2">
          <button
            type="button"
            aria-pressed={h.is_open}
            onClick={() => gravar({ ...h, is_open: !h.is_open })}
            className={cn(
              'mt-0.5 w-24 shrink-0 rounded px-2 py-1.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              h.is_open
                ? 'bg-brand-soft text-brand-ink hover:bg-brand-soft/80'
                : 'bg-surface-2 text-fg-muted-token hover:bg-surface-2/80'
            )}
          >
            {day.label}
          </button>
          {h.is_open ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {turnos.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time" size="sm" className="w-28"
                    aria-label={`${day.label}: abre${turnos.length > 1 ? ` (turno ${i + 1})` : ''}`}
                    value={t.open}
                    onChange={(e) => mudarTurno(i, { open: e.target.value })}
                  />
                  <span className="text-sm text-fg-muted-token">até</span>
                  <Input
                    type="time" size="sm" className="w-28"
                    aria-label={`${day.label}: fecha${turnos.length > 1 ? ` (turno ${i + 1})` : ''}`}
                    value={t.close}
                    onChange={(e) => mudarTurno(i, { close: e.target.value })}
                  />
                  {turnos.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Tirar turno ${i + 1} de ${day.label}`}
                      onClick={() => gravar(comTurnos(h, turnos.filter((_, j) => j !== i)))}
                      className="rounded p-1.5 text-fg-muted-token hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <XMarkIcon className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  {i === turnos.length - 1 && (
                    <>
                      <button
                        type="button"
                        aria-label={`Adicionar turno em ${day.label}`}
                        title="Adicionar turno"
                        onClick={() => gravar(comTurnos(h, [...turnos, { open: '', close: '' }]))}
                        className="rounded p-1.5 text-fg-muted-token hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <PlusIcon className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Copiar horário de ${day.label} para os outros dias abertos`}
                        title="Copiar para os outros dias abertos"
                        onClick={() => onChange(copiarParaOsOutrosDias(horas, day.key))}
                        className="rounded p-1.5 text-fg-muted-token hover:bg-surface-2 hover:text-fg-token focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {problema && <p role="alert" className="text-xs text-danger-token">{problema}</p>}
            </div>
          ) : (
            <span className="mt-1.5 text-sm text-fg-muted-token">Fechado</span>
          )}
        </li>
      );
    })}
  </ul>
);
