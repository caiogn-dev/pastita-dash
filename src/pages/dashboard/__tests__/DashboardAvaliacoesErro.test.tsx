import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import * as storesApi from '../../../services/storesApi';
import { dashboardService } from '../../../services';

// ── Mocks das dependências pesadas do dashboard (mesmo conjunto do
//    DashboardPage.test.tsx). O foco aqui é o card de avaliações. ────────────
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

// Controlável por teste: o estado do useAvaliacoesDaLoja.
const mockRefetchAvaliacoes = jest.fn();
let mockAvaliacoesState: { data: unknown; isLoading: boolean; isError: boolean };
jest.mock('../../../hooks/queries/useAvaliacoesDaLoja', () => ({
  useAvaliacoesDaLoja: () => ({ ...mockAvaliacoesState, refetch: mockRefetchAvaliacoes }),
}));

jest.mock('../../../hooks/queries/useAiDailySummary', () => ({
  useAiDailySummary: () => ({ data: undefined, isLoading: false }),
  aiDailySummaryQueryKey: () => ['ai-daily-summary'],
}));
jest.mock('../../../components/dashboard/ForecastPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/onboarding/OnboardingChecklist', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/onboarding/wizard/OnboardingWizard', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../components/onboarding/wizard/buildWizardSteps', () => ({ buildWizardSteps: () => [] }));
jest.mock('../../../components/orders/OrderDetailModal', () => ({ __esModule: true, OrderDetailModal: () => null }));
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

describe('DashboardPage — card de avaliações no erro (não inventar "0 avaliações")', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Carregamento principal OK: isola o card de avaliações do alerta geral
    // de erro da página (que só aparece quando as 3 chamadas de pedido caem).
    mockedApi.getOrders.mockResolvedValue(okOrders as never);
    mockedApi.getOrderStats.mockResolvedValue(okStats as never);
    mockedDash.getOverview.mockResolvedValue(okOverview as never);
  });

  it('falha sem cache → erro acionável, e NÃO "Ninguém avaliou ainda / 0 avaliações"', async () => {
    mockAvaliacoesState = { data: undefined, isLoading: false, isError: true };

    renderPage();

    expect(
      await screen.findByText('Não foi possível carregar as avaliações'),
    ).toBeInTheDocument();
    // O engano: dizer que ninguém avaliou quando a chamada é que falhou.
    expect(screen.queryByText('Ninguém avaliou ainda.')).not.toBeInTheDocument();
    expect(screen.queryByText('0 avaliações')).not.toBeInTheDocument();

    // "Tentar novamente" refaz a consulta de avaliações.
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(mockRefetchAvaliacoes).toHaveBeenCalledTimes(1);
  });

  it('erro ao atualizar, mas COM cache → mantém os números, sem estado de erro', async () => {
    mockAvaliacoesState = {
      data: { summary: { avg_rating: 4.8, count: 12 }, pilares: [], recent: [] },
      isLoading: false,
      isError: true,
    };

    renderPage();

    // A nota do cache continua visível; a falha de atualização não a apaga.
    expect(await screen.findByText('4,8')).toBeInTheDocument();
    expect(
      screen.queryByText('Não foi possível carregar as avaliações'),
    ).not.toBeInTheDocument();
  });

  it('sucesso com loja sem avaliações → mostra o vazio real, não o erro', async () => {
    mockAvaliacoesState = {
      data: { summary: { avg_rating: null, count: 0 } },
      isLoading: false,
      isError: false,
    };

    renderPage();

    expect(await screen.findByText('Ninguém avaliou ainda.')).toBeInTheDocument();
    expect(
      screen.queryByText('Não foi possível carregar as avaliações'),
    ).not.toBeInTheDocument();
  });
});
