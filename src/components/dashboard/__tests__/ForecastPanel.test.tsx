/**
 * O painel de previsão existe porque o forecast estava sendo entregue como texto.
 * Estes testes travam a forma: o que é número precisa aparecer como número, o
 * alerta precisa de rótulo (não só cor), e a ausência de dados não pode quebrar.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ForecastPanel, { ForecastData } from '../ForecastPanel';

// recharts não mede layout em jsdom; o que importa aqui é o painel, não o SVG.
jest.mock('../../reports/TimeSeriesChart', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="serie">{data.length} pontos</div>
  ),
}));
jest.mock('../../reports/RankBarList', () => ({
  __esModule: true,
  default: ({ items }: { items: { label: string }[] }) => (
    <div data-testid="ranking">{items.map((i) => i.label).join(',')}</div>
  ),
}));

const base: ForecastData = {
  daily: [
    { date: '2026-08-03', orders: 3, revenue: 284.72, weekday: 0 },
    { date: '2026-08-04', orders: 3, revenue: 158.73, weekday: 1 },
  ],
  window_days: 28,
  trend_pct: 404,
  recent_avg_revenue: 84.58,
  month_realized: 556.05,
  month_projection: 2839.71,
  days_left_in_month: 27,
  best_weekday: 'quinta',
  worst_weekday: 'quarta',
  weekday_avg: { segunda: 83.43, quarta: 0, quinta: 101.84 },
  days_without_sale: 18,
};

describe('ForecastPanel', () => {
  it('mostra a tendência como número, não enterrada em texto', () => {
    render(<ForecastPanel forecast={base} />);
    expect(screen.getByText('+404%')).toBeInTheDocument();
    expect(screen.getByText(/crescendo/)).toBeInTheDocument();
  });

  it('mostra realizado e projeção do mês com barra de progresso acessível', () => {
    render(<ForecastPanel forecast={base} />);
    expect(screen.getByText(/R\$\s?556,05/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.839,71/)).toBeInTheDocument();
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '20'); // 556,05 / 2839,71
  });

  it('alerta de dias sem venda tem texto, não só cor', () => {
    render(<ForecastPanel forecast={base} />);
    expect(screen.getByText(/dias sem venda nenhuma/)).toBeInTheDocument();
    // "quarta" aparece no alerta E no ranking — o alerta é o que precisa existir.
    expect(screen.getAllByText(/quarta/).length).toBeGreaterThan(0);
  });

  it('plota a série inteira recebida', () => {
    render(<ForecastPanel forecast={base} />);
    expect(screen.getByTestId('serie')).toHaveTextContent('2 pontos');
  });

  it('ordena o ranking do maior para o menor', () => {
    render(<ForecastPanel forecast={base} />);
    expect(screen.getByTestId('ranking')).toHaveTextContent('quinta,segunda,quarta');
  });

  it('queda aparece como queda, sem suavizar', () => {
    render(<ForecastPanel forecast={{ ...base, trend_pct: -32 }} />);
    expect(screen.getByText('-32%')).toBeInTheDocument();
    expect(screen.getByText(/em queda/)).toBeInTheDocument();
  });

  it('loja sem venda mostra estado vazio, não quebra', () => {
    render(<ForecastPanel forecast={{ ...base, daily: [] }} />);
    expect(screen.getByText(/Ainda não há vendas suficientes/)).toBeInTheDocument();
  });

  it('forecast ausente não quebra o dashboard', () => {
    render(<ForecastPanel forecast={null} />);
    expect(screen.getByText(/Ainda não há vendas suficientes/)).toBeInTheDocument();
  });
});
