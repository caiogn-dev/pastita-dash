/**
 * Exportar clientes respeita a aba e a busca.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));
jest.mock('../../../hooks/queries/useSaldoDoCliente', () => ({ useSaldoDoCliente: () => ({ data: null }) }));
jest.mock('../../../hooks/queries/useReports', () => ({
  useAnalyticsReport: () => ({ data: undefined, isLoading: false }),
}));
jest.mock('../../../hooks/queries/useCustomerStats', () => ({
  useCustomerStats: () => ({ data: undefined, isError: false, isFetching: false, refetch: jest.fn() }),
}));
jest.mock('../../../hooks/queries/useCustomerOrders', () => ({
  useCustomerOrders: () => ({ data: null, isLoading: false, fetchStatus: 'idle' }),
}));
jest.mock('../../../utils/avatar', () => ({ getAvatarColor: () => '#888', getInitials: () => 'AN' }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('segmento=em_risco&busca=ana'), jest.fn()],
  useNavigate: () => jest.fn(),
}));
jest.mock('../../../services/reports', () => ({ downloadBlob: jest.fn() }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const CLIENTES = [
  { id: 'c1', user_name: 'Aline Nasche', user_email: 'a@x.com', phone: '5511975373744',
    whatsapp: '5511975373744', gasto_real: 1152.33, pedidos_reais: 32, perfil: 'vip',
    dias_sem_comprar: 2, tags: [], is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'c2', user_name: 'Leani', user_email: 'l@x.com', phone: '5563999192628',
    whatsapp: '5563999192628', gasto_real: 89.9, pedidos_reais: 9, perfil: 'vip',
    dias_sem_comprar: 5, tags: [], is_active: true, created_at: '2026-01-01T00:00:00Z' },
];
jest.mock('../../../hooks/queries/useCustomers', () => ({
  useCustomers: () => ({
    data: { count: 2, results: CLIENTES },
    isLoading: false, isFetching: false, error: null, refetch: jest.fn(),
  }),
}));

import { CustomersPage } from '../CustomersPage';
import { exportarClientes } from '../../../services/storesApi';
import { downloadBlob } from '../../../services/reports';

/** Do admin do Prefiro: a aba que o lojista está vendo vira planilha. */
it('exporta a aba e a busca da tela', async () => {
  const blob = new Blob(['x']);
  (exportarClientes as jest.Mock).mockResolvedValue(blob);
  render(<CustomersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(blob, 'clientes-em_risco.csv'));
  expect(exportarClientes).toHaveBeenCalledWith({ store: 'loja-1', search: 'ana', segmento: 'em_risco' });
});
