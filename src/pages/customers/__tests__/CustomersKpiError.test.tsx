import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// api.ts/logger.ts usam import.meta.env (Vite-only); mockar evita avaliação pelo ts-jest.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../services/storesApi');
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'MS' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

// Lista de clientes sempre carregada (não é o alvo do teste); só variamos o stats.
const customersRefetch = jest.fn();
jest.mock('../../../hooks/queries/useCustomers', () => ({
  useCustomers: () => ({
    data: { count: 0, results: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: customersRefetch,
  }),
}));
jest.mock('../../../hooks/queries/useCustomerOrders', () => ({
  useCustomerOrders: () => ({ data: null, isLoading: false, fetchStatus: 'idle' }),
}));

// Controlável por teste: o estado do useCustomerStats.
const statsRefetch = jest.fn();
let statsState: { data: unknown; isError: boolean; isFetching: boolean } = {
  data: undefined,
  isError: false,
  isFetching: false,
};
jest.mock('../../../hooks/queries/useCustomerStats', () => ({
  useCustomerStats: () => ({ ...statsState, refetch: statsRefetch }),
}));

import { CustomersPage } from '../CustomersPage';

beforeEach(() => {
  statsRefetch.mockClear();
  customersRefetch.mockClear();
});

test('stats falha sem cache → mostra erro nos KPIs em vez de zeros enganosos', () => {
  statsState = { data: undefined, isError: true, isFetching: false };
  render(<CustomersPage />);

  // Não pode exibir os KPIs zerados (enganam o lojista a achar que perdeu tudo).
  expect(screen.queryByText('Receita total')).not.toBeInTheDocument();
  expect(screen.queryByText(/R\$ 0,00/)).not.toBeInTheDocument();

  // Mostra estado de erro acionável.
  expect(screen.getByText(/não foi possível carregar os indicadores/i)).toBeInTheDocument();
  const retry = screen.getByRole('button', { name: /tentar novamente/i });
  fireEvent.click(retry);
  expect(statsRefetch).toHaveBeenCalled();
});

test('stats com dados → renderiza os KPIs reais, sem estado de erro', () => {
  statsState = {
    data: { total: 42, active: 30, with_orders: 12, total_revenue: 1500 },
    isError: false,
    isFetching: false,
  };
  render(<CustomersPage />);

  expect(screen.getByText('Receita total')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.queryByText(/não foi possível carregar os indicadores/i)).not.toBeInTheDocument();
});
