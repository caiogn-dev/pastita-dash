/**
 * O extrato na ficha do cliente responde "de onde veio esse dinheiro?".
 *
 * O dono olhou a MADU CACHEADA e não soube dizer se os R$ 3,13 vieram da
 * compra dela ou do cupom MADULASH que as amigas usaram. O backend já
 * responde; a ficha precisa mostrar — e mostrar O NOME de quem comprou, que é
 * a parte que fecha a pergunta.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEventBase from '@testing-library/user-event';
import '@testing-library/jest-dom';

const userEvent = userEventBase.setup({ delay: null });

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
  cashbackService: { ajustar: jest.fn(), extrato: jest.fn() },
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
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'MC' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import { CustomerDrawer } from '../CustomersPage';
import { cashbackService } from '../../../services/cashback';

const MADU = {
  id: 'c1', user_name: 'Madu Cacheada', user_email: 'm@x.com',
  phone: '5563992433905', whatsapp: '5563992433905',
  tags: [], notes: '', created_at: '2026-01-01T00:00:00Z',
} as never;

const SALDO = {
  phone: '5563992433905', nome: 'Madu', saldo: '3.13', saldo_carteira: '0.00',
  cupons_entrega: 0, vence_em: '2026-10-10T00:00:00Z', dias_para_vencer: 30,
};

const INDICACAO = {
  tipo: 'entrada', quando: '2026-09-10T12:00:00Z', origem: 'referral',
  rotulo: 'Indicação', valor: '3.13', restante: '3.13',
  pedido: { id: 'o1', numero: 'CE-2609104664', cliente: 'Juliane maximo', total: '62.68' },
  referencia: '', vence_em: '2026-10-10T00:00:00Z', vencido: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (cashbackService.extrato as jest.Mock).mockResolvedValue([INDICACAO]);
});

const abrirExtrato = async () => {
  render(<CustomerDrawer customer={MADU} saldo={SALDO} onClose={jest.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /de onde veio/i }));
};

it('diz que veio de INDICAÇÃO e de qual pedido', async () => {
  await abrirExtrato();
  await waitFor(() => expect(cashbackService.extrato)
    .toHaveBeenCalledWith('loja-1', '5563992433905'));
  expect(await screen.findByText('Indicação')).toBeInTheDocument();
  // A resposta que o dono procurava: o nome de quem comprou.
  expect(screen.getByText(/Juliane maximo/)).toBeInTheDocument();
  expect(screen.getByText(/CE-2609104664/)).toBeInTheDocument();
});

it('crédito manual mostra o motivo no lugar do pedido', async () => {
  (cashbackService.extrato as jest.Mock).mockResolvedValue([{
    ...INDICACAO, origem: 'adjust', rotulo: 'Ajuste manual',
    pedido: null, referencia: 'CORTESIA',
  }]);
  await abrirExtrato();
  expect(await screen.findByText('Ajuste manual')).toBeInTheDocument();
  expect(screen.getByText(/CORTESIA/)).toBeInTheDocument();
});

it('saída aparece como valor negativo', async () => {
  (cashbackService.extrato as jest.Mock).mockResolvedValue([{
    ...INDICACAO, tipo: 'saida', origem: 'redemption', rotulo: 'Usado no pedido',
    valor: '2.00', restante: null,
  }]);
  await abrirExtrato();
  expect(await screen.findByText(/-\s*R\$\s*2,00/)).toBeInTheDocument();
});

it('lote vencido é marcado em vez de sumir', async () => {
  (cashbackService.extrato as jest.Mock).mockResolvedValue([{ ...INDICACAO, vencido: true }]);
  await abrirExtrato();
  expect(await screen.findByText(/venceu/i)).toBeInTheDocument();
});

it('cliente sem lançamento recebe uma frase, não uma lista vazia', async () => {
  (cashbackService.extrato as jest.Mock).mockResolvedValue([]);
  await abrirExtrato();
  expect(await screen.findByText(/nenhum lançamento/i)).toBeInTheDocument();
});

it('não busca o extrato antes de alguém pedir', () => {
  render(<CustomerDrawer customer={MADU} saldo={SALDO} onClose={jest.fn()} />);
  expect(cashbackService.extrato).not.toHaveBeenCalled();
});
