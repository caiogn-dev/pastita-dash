/**
 * ReportsFilterBar — seletor de período dos Relatórios (parte da fundação).
 *
 * Antes só havia presets (7d/30d/90d/1y) num <select>. Aqui os presets viram
 * botões + um modo "Personalizado" com data início/fim. O valor é um DateRange
 * (o mesmo que os serviços de relatório aceitam): preset → `{ period }`,
 * personalizado → `{ start_date, end_date }`. O backend já entende os dois.
 */
import React from 'react';
import { PeriodChips, type PeriodOption } from '../ui/PeriodChips';
import type { DateRange } from '../../services/reports';

type Period = NonNullable<DateRange['period']>;

/** Da janela mais estreita à mais larga — a ordem é a linha do tempo.
 *  `hoje`/`ontem` entraram porque o menor preset era 7 dias, e "quanto vendi
 *  hoje" é a pergunta mais frequente do dono. */
const PRESETS: PeriodOption<Period>[] = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Este mês', value: 'mes' },
  { label: '90 dias', value: '90d' },
  { label: '1 ano', value: '1y' },
];

export interface ReportsFilterBarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const ReportsFilterBar: React.FC<ReportsFilterBarProps> = ({ value, onChange }) => {
  const isCustom = Boolean(value.start_date || value.end_date);

  const setCustomField = (field: 'start_date' | 'end_date', v: string) => {
    onChange({
      start_date: field === 'start_date' ? v : value.start_date,
      end_date: field === 'end_date' ? v : value.end_date,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodChips<Period>
        options={PRESETS}
        value={(isCustom ? '' : value.period ?? '30d') as Period}
        onChange={(period) => onChange({ period })}
        ariaLabel="Período do relatório"
      />

      <div className="mx-1 h-5 w-px bg-border-token" aria-hidden />

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Data início"
          value={value.start_date ?? ''}
          max={value.end_date || undefined}
          onChange={(e) => setCustomField('start_date', e.target.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-sm bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand ${
            isCustom ? 'border-brand' : 'border-border-token'
          }`}
        />
        <span className="text-sm text-fg-muted-token">até</span>
        <input
          type="date"
          aria-label="Data fim"
          value={value.end_date ?? ''}
          min={value.start_date || undefined}
          onChange={(e) => setCustomField('end_date', e.target.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-sm bg-surface text-fg-token focus:outline-none focus:ring-2 focus:ring-brand ${
            isCustom ? 'border-brand' : 'border-border-token'
          }`}
        />
        {isCustom && (
          <button
            type="button"
            onClick={() => onChange({ period: '30d' })}
            className="ml-1 text-xs text-fg-muted-token hover:text-fg-token underline"
          >
            limpar
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportsFilterBar;
