import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Integração no call site mais alarmante: quando o relatório "overview" falha,
 * a seção NÃO pode pintar "R$ 0,00" de faturamento (era o comportamento antigo,
 * `cur?.revenue ?? 0`). Deve mostrar o aviso de erro e o retry deve refazer a
 * query. Prova que o `error`/`onRetry` está de fato ligado ao `useAnalyticsReport`.
 */
const overviewRefetch = jest.fn();
let overviewState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

jest.mock('../../../../hooks/queries/useReports', () => ({
  useAnalyticsReport: () => ({ ...overviewState, refetch: overviewRefetch }),
  useDashboardStats: () => ({ data: undefined, isLoading: false, isError: false }),
}));

import { OverviewSummarySection } from '../OverviewSummarySection';

const range = { start: '2026-08-01', end: '2026-08-20' } as never;

beforeEach(() => {
  overviewRefetch.mockClear();
  overviewState = { data: undefined, isLoading: false, isError: false };
});

it('em erro do overview mostra aviso + retry em vez de "R$ 0,00"', () => {
  overviewState = { data: undefined, isLoading: false, isError: true };
  render(<OverviewSummarySection range={range} enabled />);

  expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
  const retry = screen.getByRole('button', { name: /tentar novamente/i });
  fireEvent.click(retry);
  expect(overviewRefetch).toHaveBeenCalledTimes(1);
});

it('com dados reais renderiza o faturamento, sem estado de erro', () => {
  overviewState = {
    isLoading: false,
    isError: false,
    data: {
      current: { orders: 3, revenue: 150, avg_ticket: 50, cancel_rate: 0, new_customers: 1, avg_rating: null, reviews: 0, bot_sessions: 0, bot_conversion: 0 },
      previous: { orders: 0, revenue: 0, avg_ticket: 0, cancel_rate: 0, new_customers: 0, avg_rating: null, reviews: 0, bot_sessions: 0, bot_conversion: 0 },
      delta: { revenue_pct: null, orders_pct: null, avg_ticket_pct: null, new_customers_pct: null },
      period: { start: '2026-08-01', end: '2026-08-20', prev_start: '2026-07-12', prev_end: '2026-07-31' },
    },
  };
  render(<OverviewSummarySection range={range} enabled />);

  expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
});
