/**
 * O cashback na ficha do cliente: sempre visível e ajustável ali mesmo.
 *
 * O bloco só renderizava com saldo > 0, então cliente zerado ficava
 * indistinguível de "a loja não tem cashback". E ajustar só era possível na
 * tela de Fidelidade, digitando o telefone à mão — a ficha mostrava o número
 * e não deixava mexer nele.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEventBase from '@testing-library/user-event';

/** Sem `delay`, a digitação não gasta o orçamento de 5s do jest quando
 *  a suíte roda em paralelo — o que se testa aqui é o payload. */
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
jest.mock('../../../services/cashback', () => ({
  cashbackService: { ajustar: jest.fn() },
}));
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../hooks/queries/useCustomerOrders', () => ({
  useCustomerOrders: () => ({ data: { results: [] }, isLoading: false, fetchStatus: 'idle' }),
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
import { cashbackService } from '../../../services/cashback';

const ALINE = {
  id: 'c1', user_name: 'Aline Nasche', user_email: 'a@x.com',
  phone: '5511975373744', whatsapp: '5511975373744',
  tags: [], notes: '', created_at: '2026-01-01T00:00:00Z',
} as never;

const SEM_SALDO = {
  phone: '5511975373744', nome: 'Aline', saldo: '0.00', saldo_carteira: '0.00',
  cupons_entrega: 0, vence_em: '', dias_para_vencer: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  (cashbackService.ajustar as jest.Mock).mockResolvedValue({});
});

it('mostra o bloco de cashback mesmo com saldo zerado', () => {
  render(<CustomerDrawer customer={ALINE} saldo={SEM_SALDO} onClose={jest.fn()} />);
  const titulo = screen.getByText(/^cashback$/i);
  // O "R$ 0,00" precisa estar NO BLOCO do cashback: o KPI "Gasto total" da
  // ficha também zera, e casar com ele não provaria nada.
  const bloco = titulo.closest('div')?.parentElement as HTMLElement;
  expect(within(bloco).getByText(/R\$\s*0,00/)).toBeInTheDocument();
});

it('mostra o bloco mesmo quando o saldo nem foi encontrado', () => {
  // Telefone gravado em outra grafia: sem o bloco, o dono conclui que a loja
  // não tem cashback em vez de suspeitar do cadastro.
  render(<CustomerDrawer customer={ALINE} saldo={null} onClose={jest.fn()} />);
  expect(screen.getByText(/cashback/i)).toBeInTheDocument();
});

it('credita saldo pela própria ficha, com motivo', async () => {
  const onAjustado = jest.fn();
  render(
    <CustomerDrawer customer={ALINE} saldo={SEM_SALDO} onClose={jest.fn()} onAjustado={onAjustado} />,
  );
  await userEvent.click(screen.getByRole('button', { name: /ajustar saldo/i }));
  await userEvent.type(screen.getByLabelText(/valor/i), '10');
  await userEvent.type(screen.getByLabelText(/motivo/i), 'cortesia pelo atraso');
  await userEvent.click(screen.getByRole('button', { name: /^creditar$/i }));

  await waitFor(() => expect(cashbackService.ajustar).toHaveBeenCalledWith('loja-1', {
    phone: '5511975373744', valor: '10', motivo: 'cortesia pelo atraso',
  }));
  await waitFor(() => expect(onAjustado).toHaveBeenCalled());
});

it('não credita sem motivo — crédito sem justificativa é buraco de dinheiro', async () => {
  render(<CustomerDrawer customer={ALINE} saldo={SEM_SALDO} onClose={jest.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /ajustar saldo/i }));
  await userEvent.type(screen.getByLabelText(/valor/i), '10');
  await userEvent.click(screen.getByRole('button', { name: /^creditar$/i }));
  expect(cashbackService.ajustar).not.toHaveBeenCalled();
});
