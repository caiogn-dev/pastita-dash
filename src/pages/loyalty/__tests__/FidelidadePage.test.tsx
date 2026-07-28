import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  updateStore: jest.fn(),
}));
jest.mock('../../../services/loyalty', () => ({
  loyaltyService: { getAccounts: jest.fn() },
}));
jest.mock('../../../services/coupons', () => ({
  couponsService: { createCoupon: jest.fn() },
}));

import { couponsService } from '../../../services/coupons';
import { loyaltyService } from '../../../services/loyalty';
import { getStores, updateStore } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/fidelidade']}>
      <Routes>
        <Route path="/stores/:storeId/fidelidade" element={<FidelidadePage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (getStores as jest.Mock).mockResolvedValue(page([store]));
  (loyaltyService.getAccounts as jest.Mock).mockResolvedValue({
    count: 1,
    results: [{ user_id: 'u1', display_name: 'Ana', email: 'a@x.com', qualified_count: 7, redeemed_count: 0, progress: 7, available_rewards: 0, updated_at: '2026-07-28T00:00:00Z' }],
  });
});

describe('FidelidadePage', () => {
  it('carrega config e lista clientes', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText(/7\/10/)).toBeInTheDocument();
  });

  it('salva threshold com merge de metadata', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    const input = await screen.findByLabelText(/itens para ganhar/i);
    await userEvent.clear(input);
    await userEvent.type(input, '8');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_enabled: true, loyalty_salads_required: 8 }),
    }));
  });

  it('cria cupom de boas-vindas em 1 clique', async () => {
    (couponsService.createCoupon as jest.Mock).mockResolvedValue({ id: 'c1', code: 'BEMVINDO10' });
    renderPage();
    await screen.findByText('Ana');
    await userEvent.click(screen.getByRole('button', { name: /criar cupom de boas-vindas/i }));
    await waitFor(() => expect(couponsService.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BEMVINDO10', first_order_only: true, is_featured: true, discount_type: 'percentage' })
    ));
  });
});
