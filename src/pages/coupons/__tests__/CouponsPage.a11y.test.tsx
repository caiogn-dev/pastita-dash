import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CouponsPage } from '../CouponsPage';
import { couponsService } from '../../../services/coupons';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../services/coupons', () => ({
  couponsService: {
    getCoupons: jest.fn(),
    getStats: jest.fn(),
    createCoupon: jest.fn(),
    updateCoupon: jest.fn(),
    deleteCoupon: jest.fn(),
    toggleActive: jest.fn(),
  },
}));

jest.mock('../../../hooks', () => ({
  useStore: () => ({
    storeId: 'store-1',
    stores: [{ id: 'store-1', slug: 'loja-teste', name: 'Loja Teste' }],
  }),
}));

const mockedService = couponsService as jest.Mocked<typeof couponsService>;

const coupon = {
  id: 'coupon-1',
  code: 'TESTE10',
  description: 'Cupom de teste',
  discount_type: 'percentage' as const,
  discount_value: 10,
  min_purchase: 0,
  max_discount: null,
  usage_limit: null,
  used_count: 0,
  is_active: true,
  is_valid_now: true,
  valid_from: '2026-01-01',
  valid_until: '2026-12-31',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CouponsPage />
    </MemoryRouter>
  );
}

describe('CouponsPage — acessibilidade dos botões de ação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getCoupons.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [coupon],
    } as never);
    mockedService.getStats.mockResolvedValue({} as never);
  });

  it('nomeia os botões de editar e excluir com o código do cupom (mobile e desktop)', async () => {
    renderPage();

    // Card mobile + linha desktop renderizam ambos no jsdom.
    const editar = await screen.findAllByRole('button', { name: /Editar cupom TESTE10/i });
    const excluir = await screen.findAllByRole('button', { name: /Excluir cupom TESTE10/i });

    expect(editar).toHaveLength(2);
    expect(excluir).toHaveLength(2);
  });

  it('não deixa botões de ação com nome genérico "Editar"/"Excluir" sem contexto', async () => {
    renderPage();
    await waitFor(() => expect(mockedService.getCoupons).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /^Editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Excluir$/i })).toBeNull();
  });
});
