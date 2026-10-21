/**
 * Como o cliente agenda: tamanho da faixa e antecedência mínima. As faixas
 * saem do horário de cada dia — antes eram 10–12 … 18–20 fixos no cardápio,
 * e a Cê, que fecha às 17h, oferecia 18–20.
 */
import React from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Card, Campo, Segmentado } from '../../components/ui';
import { ANTECEDENCIAS, INTERVALOS, faixasDoDia, type Agendamento, type OperatingHours } from './horarios';

const duracao = (min: number) => (min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min / 60} h`);

const DIAS = [
  ['monday', 'Segunda'], ['tuesday', 'Terça'], ['wednesday', 'Quarta'], ['thursday', 'Quinta'],
  ['friday', 'Sexta'], ['saturday', 'Sábado'], ['sunday', 'Domingo'],
] as const;

interface Props {
  valor: Agendamento;
  onChange: (v: Agendamento) => void;
  horas: OperatingHours;
}

export const AgendamentoCampos: React.FC<Props> = ({ valor, onChange, horas }) => {
  const exemplo = DIAS.map(([chave, nome]) => ({ nome, faixas: faixasDoDia(horas[chave], valor.intervalo) }))
    .find((d) => d.faixas.length > 0);

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg-token">
        <CalendarDaysIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
        Agendamento
      </h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <Campo rotulo="Cada horário dura">
          <Segmentado
            rotulo="Cada horário dura"
            valor={String(valor.intervalo)}
            onChange={(v) => onChange({ ...valor, intervalo: Number(v) })}
            opcoes={INTERVALOS.map((m) => ({ valor: String(m), rotulo: duracao(m) }))}
          />
        </Campo>
        <Campo rotulo="Agendar hoje com antecedência de">
          <Segmentado
            rotulo="Agendar hoje com antecedência de"
            valor={String(valor.antecedencia)}
            onChange={(v) => onChange({ ...valor, antecedencia: Number(v) })}
            opcoes={ANTECEDENCIAS.map((m) => ({ valor: String(m), rotulo: duracao(m) }))}
          />
        </Campo>
      </div>
      {exemplo && (
        <div className="mt-4" data-testid="previa-agendamento">
          <p className="overline mb-2">{exemplo.nome}</p>
          <div className="flex flex-wrap gap-1.5">
            {exemplo.faixas.map((f) => (
              <span key={f} className="rounded border border-border-token px-2 py-1 text-xs tabular-nums text-fg-token">{f}</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AgendamentoCampos;
