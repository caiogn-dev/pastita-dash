import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  updateStore: jest.fn(),
  getCategories: jest.fn(),
}));
jest.mock('../../../services/loyalty', () => ({
  loyaltyService: { getAccounts: jest.fn() },
}));
jest.mock('../../../services/coupons', () => ({
  couponsService: { createCoupon: jest.fn() },
}));

import { couponsService } from '../../../services/coupons';
import { loyaltyService } from '../../../services/loyalty';
import { getStores, updateStore, getCategories } from '../../../services/storesApi';
import FidelidadePage from '../FidelidadePage';

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { loyalty_enabled: true, loyalty_salads_required: 10 },
};
const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const categoriesFixture = [
  { id: 'cat-1', store: 'uuid-1', name: 'Saladas Clássicas', slug: 'classicas', description: '', children: [], sort_order: 0, is_active: true, products_count: 3 },
  { id: 'cat-2', store: 'uuid-1', name: 'Saladas Especiais', slug: 'especiais', description: '', children: [], sort_order: 1, is_active: true, products_count: 2 },
];

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
  (getCategories as jest.Mock).mockResolvedValue(page(categoriesFixture));
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

  it('assume programa ativo quando loyalty_enabled está ausente do metadata', async () => {
    (getStores as jest.Mock).mockResolvedValue(
      page([{ id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas', metadata: { loyalty_salads_required: 10 } }])
    );
    renderPage();
    await screen.findByText('Ana');
    expect(screen.getByRole('checkbox', { name: /programa ativo/i })).toBeChecked();
  });

  it('marca uma categoria e salva com o ID no metadata', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    const checkbox = await screen.findByRole('checkbox', { name: 'Saladas Especiais' });
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_qualifying_categories: ['cat-2'] }),
    }));
  });

  it('salva array vazio quando nenhuma categoria está marcada', async () => {
    (updateStore as jest.Mock).mockResolvedValue(store);
    renderPage();
    await screen.findByRole('checkbox', { name: 'Saladas Especiais' });
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: expect.objectContaining({ loyalty_qualifying_categories: [] }),
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
