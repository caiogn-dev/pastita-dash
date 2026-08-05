/**
 * ForecastPanel — a previsão do mês em forma visual.
 *
 * O backend (`compute_forecast`) já calculava série de 28 dias, tendência,
 * projeção do mês, média por dia da semana e dias sem venda — e tudo isso estava
 * sendo entregue como UM PARÁGRAFO de texto dentro do resumo de IA. Dado que
 * pede gráfico virava frase, e o dono não conseguia decidir nada olhando.
 *
 * Forma escolhida por tipo de dado:
 *   tendência (1 número que decide)   -> número grande com seta e cor de estado
 *   realizado vs projeção do mês      -> barra de progresso (composição de um total)
 *   receita por dia (série temporal)  -> área, uma série só (sem legenda: o título nomeia)
 *   média por dia da semana (ranking) -> barra horizontal ordenada
 *   dias sem venda (alerta)           -> destaque com ícone + rótulo, nunca cor sozinha
 *
 * Cores vêm dos tokens do tema (`--brand`, `--fg-muted`), então funciona em claro
 * e escuro sem hardcode. Status usa a paleta reservada (nunca a cor de série).
 */
import React, { useMemo } from 'react';
import {
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Card } from '../ui';
import TimeSeriesChart from '../reports/TimeSeriesChart';
import RankBarList from '../reports/RankBarList';

export interface ForecastDaily {
  date: string;
  orders: number;
  revenue: number;
  weekday: number;
}

export interface ForecastData {
  daily?: ForecastDaily[];
  window_days?: number;
  daily_avg_revenue?: number;
  recent_avg_revenue?: number;
  trend_pct?: number;
  month_realized?: number;
  month_projection?: number;
  days_left_in_month?: number;
  best_weekday?: string | null;
  worst_weekday?: string | null;
  weekday_avg?: Record<string, number>;
  days_without_sale?: number;
}

const money = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const moneyShort = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v ?? 0)}`;

const diaCurto = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

/** Número que decide: grande, com direção e contexto — não enterrado em texto. */
const TrendHero: React.FC<{ pct: number; recentAvg?: number }> = ({ pct, recentAvg }) => {
  const subindo = pct > 0;
  const estavel = pct === 0;
  // Paleta de estado (reservada), nunca a cor de série.
  const tone = estavel ? 'var(--fg-muted)' : subindo ? '#16a34a' : '#dc2626';
  const Icon = subindo ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-fg-muted-token">Tendência</span>
      <div className="flex items-center gap-2">
        {!estavel && <Icon className="h-6 w-6 shrink-0" style={{ color: tone }} aria-hidden="true" />}
        <span className="text-3xl font-semibold leading-none" style={{ color: tone }}>
          {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
        </span>
      </div>
      <span className="text-xs text-fg-muted-token">
        {estavel ? 'estável no período' : subindo ? 'crescendo' : 'em queda'}
        {recentAvg !== undefined && ` · ${money(recentAvg)}/dia agora`}
      </span>
    </div>
  );
};

/** Composição de um total -> barra de progresso, não número solto. */
const MonthProgress: React.FC<{ realized: number; projection: number; daysLeft: number }> = ({
  realized, projection, daysLeft,
}) => {
  const pct = projection > 0 ? Math.min(100, Math.round((realized / projection) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-fg-muted-token">Mês até agora</span>
        <span className="text-xs text-fg-muted-token">
          {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-fg-token">{money(realized)}</span>
        <span className="text-sm text-fg-muted-token">de {money(projection)} projetados</span>
      </div>
      {/* 2px de respiro entre o preenchimento e o trilho, como manda o spec de marcas */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--brand-soft, rgba(0,0,0,.08))' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% da projeção do mês já realizada`}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--brand)' }} />
      </div>
      <span className="text-xs text-fg-muted-token">{pct}% da projeção</span>
    </div>
  );
};

const ForecastPanel: React.FC<{ forecast?: ForecastData | null; loading?: boolean }> = ({
  forecast, loading,
}) => {
  const serie = useMemo(
    () => (forecast?.daily ?? []).map((d) => ({ ...d, dia: diaCurto(d.date) })),
    [forecast],
  );

  const ranking = useMemo(() => {
    const media = forecast?.weekday_avg ?? {};
    return Object.entries(media)
      .map(([label, value]) => ({
        label,
        value,
        // Dia sem faturamento nenhum é problema, não só "o menor" — marca como risco.
        tone: value === 0 ? ('danger' as const) : ('brand' as const),
      }))
      .sort((a, b) => b.value - a.value);
  }, [forecast]);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-40 rounded bg-black/5 dark:bg-white/5" />
        </div>
      </Card>
    );
  }

  if (!forecast || !serie.length) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-fg-token">Previsão do mês</h2>
        <p className="mt-2 text-sm text-fg-muted-token">
          Ainda não há vendas suficientes para projetar. Assim que os pedidos começarem
          a entrar, a projeção aparece aqui.
        </p>
      </Card>
    );
  }

  const semVenda = forecast.days_without_sale ?? 0;
  const janela = forecast.window_days ?? serie.length;

  return (
    <Card noPadding>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border-token">
        <h2 className="text-sm font-semibold text-fg-token flex items-center gap-2">
          <ChartBarIcon className="h-4 w-4 text-brand" aria-hidden="true" />
          Previsão do mês
        </h2>
        <span className="text-xs text-fg-muted-token">últimos {janela} dias</span>
      </div>

      <div className="p-5 space-y-5">
      {/* max-w evita que tendência e progresso fiquem em pontas opostas numa tela
          de 1500px, com um vão morto no meio. */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        <TrendHero pct={forecast.trend_pct ?? 0} recentAvg={forecast.recent_avg_revenue} />
        <MonthProgress
          realized={forecast.month_realized ?? 0}
          projection={forecast.month_projection ?? 0}
          daysLeft={forecast.days_left_in_month ?? 0}
        />
      </div>

      {semVenda > 0 && (
        // Ícone + rótulo: o alerta nunca é só cor.
        <div className="flex items-start gap-2 rounded-lg px-3 py-2"
             style={{ background: 'rgba(220,38,38,.08)' }}>
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#dc2626' }} aria-hidden="true" />
          <span className="text-xs text-fg-token">
            <strong>{semVenda}</strong> {semVenda === 1 ? 'dia sem venda nenhuma' : 'dias sem venda nenhuma'} nos
            últimos {janela}. {forecast.worst_weekday && <>O pior dia é <strong>{forecast.worst_weekday}</strong>.</>}
          </span>
        </div>
      )}

      <div>
        <h3 className="text-xs uppercase tracking-wide text-fg-muted-token mb-2">
          Receita por dia
        </h3>
        <TimeSeriesChart
          data={serie}
          xKey="dia"
          yKey="revenue"
          label="Receita"
          type="area"
          height={180}
          valueFormat={money}
          yTickFormat={moneyShort}
        />
      </div>

      {ranking.length > 0 && (
        <div className="max-w-3xl">
          <h3 className="text-xs uppercase tracking-wide text-fg-muted-token mb-2">
            Média por dia da semana
          </h3>
          <RankBarList items={ranking} valueFormat={money} />
        </div>
      )}
      </div>
    </Card>
  );
};

export default ForecastPanel;
