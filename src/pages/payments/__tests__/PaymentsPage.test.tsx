import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentsPage } from '../PaymentsPage';

/**
 * Cobre os estados de ERRO da página de Pagamentos.
 *
 * O bug original: quando a API de pedidos/stats falhava, `isLoading` virava
 * false e a página renderizava zeros ("R$ 0,00 recebido", "Nenhum pagamento
 * encontrado") — enganando o lojista a achar que perdeu o faturamento.
 * Agora falha total mostra um estado de erro com "Tentar novamente" e falha
 * parcial (com dados em cache) mostra um aviso não-bloqueante.
 */

// Controla o retorno dos hooks de query por teste.
const ordersQueryMock = jest.fn();
const statsQueryMock = jest.fn();

jest.mock('../../../hooks/queries/usePaymentsOrders', () => ({
  __esModule: true,
  usePaymentsOrders: () => ordersQueryMock(),
}));

jest.mock('../../../hooks/queries/useOrderStats', () => ({
  __esModule: true,
  useOrderStats: () => statsQueryMock(),
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'store-1', stores: [] }),
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({}),
}));

jest.mock('../../../services', () => ({
  __esModule: true,
  ordersService: { markPaid: jest.fn() },
}));

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../utils/storefrontUrl', () => ({
  __esModule: true,
  buildStorefrontUrl: () => null,
}));

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PaymentsPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  ordersQueryMock.mockReset();
  statsQueryMock.mockReset();
});

describe('PaymentsPage — estados de erro', () => {
  it('mostra estado de erro com botão de retry quando as duas queries falham sem dados', () => {
    const refetchOrders = jest.fn();
    const refetchStats = jest.fn();
    ordersQueryMock.mockReturnValue({ ...idle, isError: true, refetch: refetchOrders });
    statsQueryMock.mockReturnValue({ ...idle, isError: true, refetch: refetchStats });

    renderPage();

    expect(screen.getByText(/erro ao carregar pagamentos/i)).toBeInTheDocument();
    // NÃO deve renderizar os zeros enganosos.
    expect(screen.queryByText(/nenhum pagamento encontrado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetchOrders).toHaveBeenCalledTimes(1);
    expect(refetchStats).toHaveBeenCalledTimes(1);
  });

  it('renderiza a página normalmente quando as queries têm sucesso', () => {
    ordersQueryMock.mockReturnValue({
      ...idle,
      data: { results: [], count: 0 },
    });
    statsQueryMock.mockReturnValue({
      ...idle,
      data: { total: 0, today: 0, revenue: { total: 0 }, by_payment_status: {} },
    });

    renderPage();

    expect(screen.getByText('Pagamentos')).toBeInTheDocument();
    expect(screen.getByText(/nenhum pagamento encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/erro ao carregar pagamentos/i)).not.toBeInTheDocument();
  });

  const orderRow = {
    id: 'o1',
    order_number: '1001',
    customer_name: 'Cliente',
    total: 50,
    payment_method: 'pix',
    payment_status: 'paid',
    created_at: '2026-07-24T12:00:00Z',
  };

  it('só a query de stats falha (sem cache): erro na seção de indicadores, sem zeros — tabela intacta', () => {
    ordersQueryMock.mockReturnValue({ ...idle, data: { results: [orderRow], count: 1 } });
    // stats 500 sem dado em cache — NÃO pode renderizar KPIs zerados.
    statsQueryMock.mockReturnValue({ ...idle, isError: true });

    renderPage();

    // A tabela com o pedido continua visível.
    expect(screen.getByText('#1001')).toBeInTheDocument();
    // Os indicadores mostram erro em vez de "R$ 0,00 recebido".
    expect(screen.getByText(/não foi possível carregar os indicadores/i)).toBeInTheDocument();
    // Nenhum texto "recebido" (nem subtítulo, nem card "Total Recebido") deve aparecer.
    expect(screen.queryByText(/recebido/i)).not.toBeInTheDocument();
    // Não é falha total.
    expect(screen.queryByText(/erro ao carregar pagamentos/i)).not.toBeInTheDocument();
  });

  it('só a query de orders falha (sem cache): erro na seção da tabela, sem "nenhum pagamento" — KPIs intactos', () => {
    ordersQueryMock.mockReturnValue({ ...idle, isError: true });
    statsQueryMock.mockReturnValue({
      ...idle,
      data: { total: 5, today: 0, revenue: { total: 1234 }, by_payment_status: { paid: 5 } },
    });

    renderPage();

    // KPIs reais renderizam (receita 1.234,00).
    expect(screen.getAllByText(/1\.234,00/).length).toBeGreaterThan(0);
    // A tabela mostra erro, não o enganoso "nenhum pagamento encontrado".
    expect(screen.getByText(/não foi possível carregar os pedidos/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum pagamento encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/erro ao carregar pagamentos/i)).not.toBeInTheDocument();
  });

  it('falha de atualização com dados em cache nas duas queries: aviso não-bloqueante', () => {
    ordersQueryMock.mockReturnValue({ ...idle, isError: true, data: { results: [orderRow], count: 1 } });
    statsQueryMock.mockReturnValue({
      ...idle,
      isError: true,
      data: { total: 5, today: 0, revenue: { total: 1234 }, by_payment_status: { paid: 5 } },
    });

    renderPage();

    // Dados em cache continuam visíveis...
    expect(screen.getByText('#1001')).toBeInTheDocument();
    expect(screen.getAllByText(/1\.234,00/).length).toBeGreaterThan(0);
    // ...com aviso de que podem estar desatualizados.
    expect(screen.getByText(/alguns dados podem estar desatualizados/i)).toBeInTheDocument();
    // Sem erros de seção (as duas têm cache).
    expect(screen.queryByText(/não foi possível carregar/i)).not.toBeInTheDocument();
  });
});
