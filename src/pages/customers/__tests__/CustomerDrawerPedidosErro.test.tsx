/**
 * A ficha do cliente não pode transformar uma falha de rede em "esse cliente
 * nunca comprou".
 *
 * O histórico de pedidos e os KPIs do topo (Gasto total / Pedidos / Ticket
 * médio) saem todos de `useCustomerOrders`. Só o `isLoading` era tratado:
 * quando a busca de `/stores/orders/?customer=<phone>` caía (rede/500), a
 * lista virava `[]` e a ficha mostrava "Gasto total R$ 0,00 · Pedidos 0" +
 * "Nenhum pedido encontrado" — o MESMO engano de "zeros" do incidente do
 * Vinicius citado no código, só que agora nascido de uma falha silenciosa.
 * Aqui garantimos o erro acionável (com "Tentar novamente") no lugar dos
 * zeros, e que o caminho de sucesso continua mostrando os números reais.
 */
import { render, screen } from '@testing-library/react';
import userEventBase from '@testing-library/user-event';

const userEvent = userEventBase.setup({ delay: null });
import '@testing-library/jest-dom';

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
jest.mock('../../../services/cashback', () => ({ cashbackService: { ajustar: jest.fn() } }));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));

// Retorno mutável do hook de pedidos — cada teste define o cenário antes de
// renderizar. O prefixo `mock` é o que o jest permite dentro do factory.
let mockOrdersReturn: Record<string, unknown> = {};
jest.mock('../../../hooks/queries/useCustomerOrders', () => ({
  useCustomerOrders: () => mockOrdersReturn,
}));

jest.mock('../../../hooks/queries/useCustomers', () => ({
  useCustomers: () => ({ data: null, isLoading: false, isFetching: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../../../hooks/queries/useCustomerStats', () => ({
  useCustomerStats: () => ({ data: null, isFetching: false }),
}));
jest.mock('../../../hooks/queries/useSaldoDoCliente', () => ({ useSaldoDoCliente: () => ({ data: null }) }));
jest.mock('../../../hooks/queries/useReports', () => ({
  useAnalyticsReport: () => ({ data: undefined, isLoading: false }),
}));
jest.mock('../../../hooks/useOrderDetailModal', () => ({
  useOrderDetailModal: () => ({ openOrder: jest.fn() }),
}));
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'AN' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { CustomerDrawer } from '../CustomersPage';

const ALINE = {
  id: 'c1', user_name: 'Aline Nasche', user_email: 'a@x.com',
  phone: '5511975373744', whatsapp: '5511975373744',
  tags: [], notes: '', created_at: '2026-01-01T00:00:00Z',
} as never;

beforeEach(() => {
  jest.clearAllMocks();
});

it('falha ao carregar pedidos sem cache → erro acionável, não "Nenhum pedido encontrado"', async () => {
  const refetch = jest.fn();
  mockOrdersReturn = {
    data: undefined, isError: true, isLoading: false, fetchStatus: 'idle', refetch,
  };

  render(<CustomerDrawer customer={ALINE} onClose={jest.fn()} />);

  // Não deve fingir que o cliente nunca comprou.
  expect(screen.queryByText(/nenhum pedido encontrado/i)).not.toBeInTheDocument();
  // Erro acionável com retry no lugar dos zeros.
  expect(screen.getByText(/não foi possível carregar os pedidos/i)).toBeInTheDocument();

  const botao = screen.getByRole('button', { name: /tentar novamente/i });
  await userEvent.click(botao);
  expect(refetch).toHaveBeenCalledTimes(1);
});

it('falha sem cache → KPIs mostram "—", não "R$ 0,00" enganoso', () => {
  mockOrdersReturn = {
    data: undefined, isError: true, isLoading: false, fetchStatus: 'idle', refetch: jest.fn(),
  };

  render(<CustomerDrawer customer={ALINE} onClose={jest.fn()} />);

  // "Gasto total" é KPI do topo. Na falha, não pode zerar (leria como
  // "nunca gastou"): mostra indeterminado.
  const gasto = screen.getByText(/gasto total/i).closest('div') as HTMLElement;
  expect(gasto).not.toHaveTextContent(/R\$\s*0,00/);
  expect(gasto).toHaveTextContent('—');
});

it('sucesso → KPIs e histórico reais, sem estado de erro', () => {
  mockOrdersReturn = {
    data: { results: [
      { id: 'o1', order_number: '1042', status: 'delivered', total: '36.99', created_at: '2026-02-01T12:00:00Z' },
    ] },
    isError: false, isLoading: false, fetchStatus: 'idle', refetch: jest.fn(),
  };

  render(<CustomerDrawer customer={ALINE} onClose={jest.fn()} />);

  expect(screen.queryByText(/não foi possível carregar os pedidos/i)).not.toBeInTheDocument();
  // Gasto total real do único pedido não cancelado.
  const gasto = screen.getByText(/gasto total/i).closest('div') as HTMLElement;
  expect(gasto).toHaveTextContent(/R\$\s*36,99/);
  // Pedido listado (a Tabela pode renderizar linha desktop + card mobile).
  expect(screen.getAllByText('#1042').length).toBeGreaterThan(0);
});
