import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ChannelsSection } from '../SalesSections';
import { useAnalyticsReport } from '../../../../hooks/queries/useReports';

jest.mock('../../../../hooks/queries/useReports', () => ({ useAnalyticsReport: jest.fn() }));
jest.mock('../../../../components/reports/DonutChart', () => ({ DonutChart: () => null }));
jest.mock('../ImportarExtrato99', () => ({ ImportarExtrato99: () => <button>Importar extrato da 99</button> }));

it('botão de importar extrato aparece só na linha da 99', () => {
  (useAnalyticsReport as jest.Mock).mockReturnValue({
    isLoading: false, isError: false, refetch: jest.fn(),
    data: {
      by_source: [
        { channel: 'bot', orders: 3, revenue: 90, avg_ticket: 30 },
        { channel: '99food', orders: 6, revenue: 258.76, avg_ticket: 43.13, recebido: 0, conciliados: 0 },
      ],
      by_payment_method: [], by_delivery_method: [],
    },
  });
  render(<MemoryRouter><ChannelsSection range={{ period: '7d' }} enabled /></MemoryRouter>);
  expect(screen.getAllByRole('button', { name: /importar extrato da 99/i })).toHaveLength(1);
});
