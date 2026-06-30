/**
 * TrialBanner tests
 *
 * Cobre:
 *  1. Banner vermelho para loja suspensa (status=suspended)
 *  2. Banner de aviso para pagamento atrasado (status=past_due)
 *  3. Caminho de trial normal (regressão)
 *  4. Sem banner quando não há trial ativo nem status crítico
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---- mocks (hoisted pelo jest antes dos imports abaixo) ----------------

const mockGetSubscription = jest.fn();
const mockGetStoreBilling = jest.fn();
const mockTrialDaysRemaining = jest.fn();
const mockUseStore = jest.fn();

jest.mock('../../../hooks/useStore', () => ({
  useStore: () => mockUseStore(),
}));

jest.mock('../../../services/billing', () => ({
  getStoreBilling: (...a: unknown[]) => mockGetStoreBilling(...a),
  trialDaysRemaining: (...a: unknown[]) => mockTrialDaysRemaining(...a),
  getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
}));

// ---- importação do componente (após mocks) ------------------------------

import { TrialBanner } from '../TrialBanner';

// ---- helpers ------------------------------------------------------------

function renderBanner() {
  return render(
    <MemoryRouter>
      <TrialBanner />
    </MemoryRouter>,
  );
}

const fakeStore = { id: 'store-1', slug: 'minha-loja', name: 'Minha Loja' };

beforeEach(() => {
  jest.clearAllMocks();
  // padrões: loja selecionada, sem trial, assinatura ativa
  mockUseStore.mockReturnValue({ store: fakeStore, storeSlug: 'minha-loja' });
  mockGetStoreBilling.mockReturnValue({ trial_ends_at: null });
  mockTrialDaysRemaining.mockReturnValue(null);
  mockGetSubscription.mockResolvedValue({ status: 'active' });
});

// ---- testes de status crítico ------------------------------------------

test('exibe banner vermelho com CTA de reativação quando status=suspended', async () => {
  mockGetSubscription.mockResolvedValue({ status: 'suspended' });

  renderBanner();

  await waitFor(() => {
    expect(screen.getByText(/suspensa/i)).toBeInTheDocument();
  });

  // link aponta para /assinatura
  const link = screen.getByRole('link', { name: /reativar/i });
  expect(link).toHaveAttribute('href', '/assinatura');
});

test('exibe banner de aviso quando status=past_due', async () => {
  mockGetSubscription.mockResolvedValue({ status: 'past_due' });

  renderBanner();

  await waitFor(() => {
    expect(screen.getByText(/atrasado/i)).toBeInTheDocument();
  });

  const link = screen.getByRole('link', { name: /regularize/i });
  expect(link).toHaveAttribute('href', '/assinatura');
});

// ---- regressão: trial normal -------------------------------------------

test('exibe banner de trial quando status=trialing e há dias restantes', async () => {
  mockGetStoreBilling.mockReturnValue({ trial_ends_at: '2099-12-31T23:59:59Z' });
  mockTrialDaysRemaining.mockReturnValue(5);
  mockGetSubscription.mockResolvedValue({ status: 'trialing' });

  renderBanner();

  // banner de trial aparece imediatamente (não espera getSubscription)
  expect(screen.getByText(/5 dias de trial/i)).toBeInTheDocument();
});

test('não exibe nada quando status=active e sem trial', async () => {
  mockGetSubscription.mockResolvedValue({ status: 'active' });

  const { container } = renderBanner();

  await waitFor(() => {
    // aguarda o useEffect resolver a promessa
    expect(mockGetSubscription).toHaveBeenCalledWith('minha-loja');
  });

  expect(container.firstChild).toBeNull();
});

test('não exibe banner de suspensão quando não há loja selecionada', async () => {
  mockUseStore.mockReturnValue({ store: null, storeSlug: null });

  const { container } = renderBanner();

  // getSubscription NÃO deve ser chamado sem slug
  expect(mockGetSubscription).not.toHaveBeenCalled();
  expect(container.firstChild).toBeNull();
});
