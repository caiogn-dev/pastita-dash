import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OverviewSummarySection } from '../OverviewSummarySection';
import { useAnalyticsReport, useDashboardStats } from '../../../../hooks/queries/useReports';

jest.mock('../../../../hooks/queries/useReports', () => ({
  useAnalyticsReport: jest.fn(),
  useDashboardStats: jest.fn(),
}));

const mockedUseAnalyticsReport = useAnalyticsReport as jest.Mock;
const mockedUseDashboardStats = useDashboardStats as jest.Mock;

const overviewData = {
  current: {
    orders: 12, revenue: 3400, avg_ticket: 283, cancel_rate: 2,
    new_customers: 4, avg_rating: 4.6, reviews: 8, bot_sessions: 20, bot_conversion: 30,
  },
  previous: {
    orders: 10, revenue: 3000, avg_ticket: 300, cancel_rate: 1,
    new_customers: 3, avg_rating: 4.5, reviews: 6, bot_sessions: 18, bot_conversion: 28,
  },
  delta: { revenue_pct: 13.3, orders_pct: 20, avg_ticket_pct: -5.7, new_customers_pct: 33.3 },
  period: { start: '2026-07-15', end: '2026-08-14', prev_start: '2026-06-15', prev_end: '2026-07-14' },
};

describe('OverviewSummarySection — resiliência do resumo de hoje', () => {
  it('quando o resumo de hoje falha (mas o período carrega), avisa e oferece retry — sem "R$ 0,00" enganoso', () => {
    const refetch = jest.fn();
    mockedUseAnalyticsReport.mockReturnValue({
      data: overviewData, isLoading: false, isError: false, refetch: jest.fn(),
    });
    mockedUseDashboardStats.mockReturnValue({
      data: undefined, isLoading: false, isError: true, refetch,
    });

    render(<OverviewSummarySection range={{ period: '30d' }} enabled />);

    // O período (faturamento do herói) continua visível — só o "hoje" falhou.
    expect(screen.getByText(/R\$\s*3\.400,00/)).toBeInTheDocument();
    // Nada de "Hoje: R$ 0,00" fingindo ser real.
    expect(screen.queryByText(/Hoje:/)).not.toBeInTheDocument();
    // Aviso de falha + retry que chama refetch do stats.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('com stats OK, mostra o resumo de hoje normalmente (sem falso alarme)', () => {
    mockedUseAnalyticsReport.mockReturnValue({
      data: overviewData, isLoading: false, isError: false, refetch: jest.fn(),
    });
    mockedUseDashboardStats.mockReturnValue({
      data: { today: { revenue: 500, orders: 3 }, alerts: { pending_orders: 0, low_stock_products: 0 } },
      isLoading: false, isError: false, refetch: jest.fn(),
    });

    render(<OverviewSummarySection range={{ period: '30d' }} enabled />);

    expect(screen.getByText(/Hoje:/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
