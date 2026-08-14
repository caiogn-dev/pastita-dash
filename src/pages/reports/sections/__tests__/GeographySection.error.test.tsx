import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GeographySection } from '../GeographySection';
import { useAnalyticsReport } from '../../../../hooks/queries/useReports';
import { useStore } from '../../../../hooks/useStore';

jest.mock('../../../../hooks/queries/useReports', () => ({
  useAnalyticsReport: jest.fn(),
}));
jest.mock('../../../../hooks/useStore', () => ({
  useStore: jest.fn(),
}));

const mockedUseAnalyticsReport = useAnalyticsReport as jest.Mock;
const mockedUseStore = useStore as jest.Mock;

describe('GeographySection — resiliência a falha da query', () => {
  beforeEach(() => {
    mockedUseStore.mockReturnValue({ storeId: 1 });
  });

  it('em falha, mostra aviso de erro + retry e NÃO o "sem dados" enganoso', () => {
    const refetch = jest.fn();
    mockedUseAnalyticsReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<GeographySection range={{ period: '30d' }} enabled />);

    // Cada cartão da seção deve avisar a falha (não "Nenhum pedido…").
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nenhum pedido com coordenada exata/i)).not.toBeInTheDocument();

    // O botão de retry chama refetch.
    const retryBtn = screen.getAllByRole('button', { name: /tentar novamente/i })[0];
    fireEvent.click(retryBtn);
    expect(refetch).toHaveBeenCalled();
  });

  it('em sucesso sem dados, mantém o estado vazio normal (sem falso alarme de erro)', () => {
    mockedUseAnalyticsReport.mockReturnValue({
      data: { points: [], neighborhoods: [], distance_bands: [], zones: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<GeographySection range={{ period: '30d' }} enabled />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum pedido com coordenada exata/i)).toBeInTheDocument();
  });
});
