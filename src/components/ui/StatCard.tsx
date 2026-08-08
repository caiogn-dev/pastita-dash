/**
 * StatCard canônico — redesign painel (identidade Pastita/Cardapidex)
 * Métrica de dashboard usando o Card canônico.
 */
import React from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';
import { Sparkline } from './Sparkline';

export type StatCardTone = 'default' | 'brand' | 'warning' | 'success' | 'danger';

/**
 * Comparativo com o período anterior.
 *
 * `variacaoPct: null` significa SEM BASE DE COMPARAÇÃO — o período anterior foi
 * zero. Mostrar "0%" ali seria mentira: uma loja que saiu de R$ 0 para R$ 2.888
 * não teve 0% de variação (aconteceu de verdade na Pastita em ago/2026).
 */
export interface StatCardComparativo {
  variacaoPct: number | null;
  rotulo: string;
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: StatCardTone;
  comparativo?: StatCardComparativo;
  /** Explicação do indicador — vira `title` acessível no rótulo. */
  ajuda?: string;
  /**
   * Ícone do indicador, exibido num chip tonalizado.
   *
   * Não é enfeite: numa faixa de quatro números iguais em tipo e peso, o olho
   * não tem âncora e lê os quatro para achar o que queria. O chip colorido dá
   * a cada card uma identidade reconhecível de relance — você acha "receita"
   * pela cor antes de ler a palavra.
   */
  icone?: React.ReactNode;
  /**
   * Série curta para o mini-gráfico.
   *
   * Vive ABAIXO do valor e do comparativo, nunca no lugar deles: é contexto,
   * não a informação. Quem quer o número exato lê o número.
   */
  serie?: number[];
  onClick?: () => void;
  className?: string;
}

const VALUE_TONE: Record<StatCardTone, string> = {
  default: 'text-fg-token',
  brand: 'text-brand-ink',
  warning: 'text-[var(--warning)]',
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
};

/** Fundo do chip do ícone. Tom suave — o valor é que tem de gritar, não o chip. */
const CHIP_TONE: Record<StatCardTone, string> = {
  default: 'bg-surface-2 text-fg-muted-token',
  brand: 'bg-[var(--brand-soft)] text-brand-ink',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  tone = 'default',
  comparativo,
  ajuda,
  icone,
  serie,
  onClick,
  className,
}) => {
  const clickable = typeof onClick === 'function';
  const pct = comparativo?.variacaoPct;

  /**
   * Dia que ainda não começou não é queda.
   *
   * Às 8h da manhã a receita de hoje é R$ 0, e o comparativo devolve −100%.
   * O card pintava isso de vermelho com "▼ 100,0% vs ontem" — a primeira
   * coisa que o dono via ao abrir o painel era um alarme sobre um dia que
   * ainda nem aconteceu. Alarme que aparece todo dia às 8h não é alarme.
   *
   * −100% exato com valor zerado é o dia não começado; a comparação volta a
   * fazer sentido assim que entrar o primeiro pedido.
   */
  const valorZerado =
    value === 0 || value === '0' || (typeof value === 'string' && /^R\$\s*0[,.]00$/.test(value));
  const semBase = valorZerado && pct !== null && pct !== undefined && pct <= -99.9;

  const subiu = !semBase && typeof pct === 'number' && pct > 0;
  const caiu = !semBase && typeof pct === 'number' && pct < 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 transition-colors',
        clickable && 'cursor-pointer hover:bg-surface-2',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icone && (
          <span
            aria-hidden
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded [&>svg]:h-5 [&>svg]:w-5',
              CHIP_TONE[tone]
            )}
          >
            {icone}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="overline" title={ajuda}>
            {label}
            {ajuda && <span className="ml-1 cursor-help opacity-60" aria-hidden>?</span>}
          </p>
          <p
            className={cn(
              // tabular-nums: sem isso os dígitos mudam de largura e o número
              // "pula" a cada atualização em tempo real — o painel parece
              // instável mesmo quando o dado está certo.
              'mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums',
              VALUE_TONE[tone]
            )}
          >
            {value}
          </p>
        </div>
      </div>
      {comparativo && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          {pct === null ? (
            // Sem período anterior não há percentual honesto a mostrar.
            <span className="text-fg-muted-token">sem base de comparação</span>
          ) : semBase ? (
            <span className="text-fg-muted-token">ainda sem movimento hoje</span>
          ) : (
            <>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  subiu && 'text-[var(--success)]',
                  caiu && 'text-[var(--danger)]',
                  !subiu && !caiu && 'text-fg-muted-token'
                )}
              >
                {subiu ? '▲' : caiu ? '▼' : '='} {Math.abs(pct ?? 0).toFixed(1)}%
              </span>
              <span className="text-fg-muted-token">{comparativo.rotulo}</span>
            </>
          )}
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-fg-muted-token">{sub}</p>}

      {serie && serie.length > 1 && (
        // Depois do texto, não antes: a linha é contexto do número, e ler
        // primeiro a forma e depois o valor inverte a ordem da pergunta.
        <Sparkline
          valores={serie}
          rotulo={`${label}: variação dos últimos ${serie.length} dias`}
          className={cn('mt-2.5', VALUE_TONE[tone])}
        />
      )}
    </Card>
  );
};

StatCard.displayName = 'StatCard';

export default StatCard;
