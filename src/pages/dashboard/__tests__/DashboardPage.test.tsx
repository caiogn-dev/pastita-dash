import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import * as storesApi from '../../../services/storesApi';
import { dashboardService } from '../../../services';

// ── Mocks das dependências pesadas do dashboard ──────────────────────────────
jest.mock('../../../services/storesApi', () => ({
  getOrders: jest.fn(),
  getOrderStats: jest.fn(),
  updateOrderStatus: jest.fn(),
}));

jest.mock('../../../services', () => ({
  dashboardService: {
    getOverview: jest.fn(),
    getProjectHealth: jest.fn(),
  },
}));

jest.mock('../../../services/onboarding', () => ({
  getChecklist: jest.fn().mockResolvedValue({ all_done: true, wizard_seen: true }),
  markWizardSeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'store-1', storeSlug: 'loja-x' }),
  useOrderDetailModal: () => ({ openOrder: jest.fn() }),
}));

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: () => ({ user: { is_staff: false } }),
}));

jest.mock('../../../hooks/useOrderSound', () => ({
  useOrderSound: () => ({ checkAndNotify: jest.fn() }),
}));

// Componentes filhos pesados renderizam nada — foco é o estado de erro da página.
jest.mock('../../../components/onboarding/OnboardingChecklist', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/onboarding/wizard/OnboardingWizard', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/onboarding/wizard/buildWizardSteps', () => ({ buildWizardSteps: () => [] }));
jest.mock('../../../components/orders/OrderDetailModal', () => ({ __esModule: true, OrderDetailModal: () => null }));
// Resumo IA usa react-query + services/api (import.meta) — fora do foco deste teste.
jest.mock('../../../components/dashboard/AiDailySummaryCard', () => ({ __esModule: true, AiDailySummaryCard: () => null }));

const mockedApi = storesApi as jest.Mocked<typeof storesApi>;
const mockedDash = dashboardService as jest.Mocked<typeof dashboardService>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <DashboardPage />
    </MemoryRouter>,
  );

const okOrders = { results: [] as unknown[] };
const okStats = { total_orders: 0, today_revenue: 0, by_status: {} };
const okOverview = { conversations: { by_status: { open: 0 } }, orders: { by_status: { pending: 0 } } };

describe('DashboardPage — estado de erro no carregamento', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra alerta de erro com botão de retry quando TODAS as chamadas falham', async () => {
    mockedApi.getOrders.mockRejectedValue(new Error('rede'));
    mockedApi.getOrderStats.mockRejectedValue(new Error('rede'));
    mockedDash.getOverview.mockRejectedValue(new Error('rede'));

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/não foi possível carregar/i);
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('não mostra alerta de erro quando ao menos uma chamada é bem-sucedida', async () => {
    mockedApi.getOrders.mockResolvedValue(okOrders as never);
    mockedApi.getOrderStats.mockRejectedValue(new Error('rede'));
    mockedDash.getOverview.mockRejectedValue(new Error('rede'));

    renderPage();

    // A tabela sai do loading (render dos pedidos) => carga parcial concluída.
    await waitFor(() => expect(screen.getByText(/nenhum pedido ainda/i)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('o botão "Tentar novamente" refaz as chamadas de carregamento', async () => {
    mockedApi.getOrders.mockRejectedValue(new Error('rede'));
    mockedApi.getOrderStats.mockRejectedValue(new Error('rede'));
    mockedDash.getOverview.mockRejectedValue(new Error('rede'));

    renderPage();

    await screen.findByRole('alert');
    const callsBefore = mockedApi.getOrders.mock.calls.length;

    // Na nova tentativa, deixa uma chamada passar para o erro sumir.
    mockedApi.getOrders.mockResolvedValue(okOrders as never);
    mockedApi.getOrderStats.mockResolvedValue(okStats as never);
    mockedDash.getOverview.mockResolvedValue(okOverview as never);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    await waitFor(() => expect(mockedApi.getOrders.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
