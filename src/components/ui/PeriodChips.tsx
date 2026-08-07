/**
 * PeriodChips — seleção de janela de tempo em um clique.
 *
 * O painel é lido durante o serviço: cozinha cheia, celular na mão, pressa.
 * Nesse contexto um dropdown custa três interações (abrir, procurar, escolher)
 * para responder a pergunta mais frequente do dia, que é "quanto vendi hoje".
 * Chip resolve em uma.
 *
 * A ORDEM CARREGA INFORMAÇÃO: da janela mais estreita para a mais larga.
 * Não é decoração — é a linha do tempo que o dono percorre mentalmente ao
 * abrir a tela, e deixa "Hoje" na posição de leitura natural.
 *
 * Antes existiam dois idiomas para a mesma interação: pílulas no inbox do
 * WhatsApp (CSS local) e botões retangulares nos relatórios. Mesma ação com
 * duas aparências ensina o operador duas vezes.
 */
import React from 'react';
import { cn } from '../../utils/cn';

export interface PeriodOption<T extends string = string> {
  value: T;
  label: string;
  /** Contador opcional à direita (ex.: nº de conversas no filtro). */
  count?: number;
}

export interface PeriodChipsProps<T extends string = string> {
  options: PeriodOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Rótulo do grupo para leitores de tela. */
  ariaLabel?: string;
  className?: string;
}

/** Janelas que o dono de loja usa no dia a dia, da mais estreita à mais larga. */
export const PERIODOS_PADRAO: PeriodOption[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mes', label: 'Este mês' },
];

export function PeriodChips<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel = 'Selecionar período',
  className,
}: PeriodChipsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {options.map((opt) => {
        const ativo = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(opt.value)}
            className={cn(
              // min-h-9: alvo de toque utilizável com o celular na mão.
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5',
              'text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              ativo
                // text-on-brand e não text-white: branco sobre o ouro da marca
                // dá 2,40:1 no claro e 1,79:1 no escuro (WCAG pede 4,5:1).
                ? 'border-brand bg-brand text-on-brand'
                : 'border-transparent bg-surface-2 text-fg-muted-token hover:text-fg-token'
            )}
          >
            {opt.label}
            {typeof opt.count === 'number' && opt.count > 0 && (
              <span className="text-xs font-bold opacity-75 tabular-nums">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

PeriodChips.displayName = 'PeriodChips';

export default PeriodChips;
