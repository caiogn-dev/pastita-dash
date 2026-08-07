import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CouponsPage } from '../CouponsPage';
import { couponsService } from '../../../services/coupons';

jest.mock('../../../services/storesApi', () => ({
  getCategories: jest.fn().mockResolvedValue({ results: [] }),
}));

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

    // Card mobile + linha desktop renderizam ambos no jsdom, mas com formas
    // diferentes: no card as ações são botões diretos; na linha elas moram num
    // kebab, para não gastar largura de tabela nem deixar o "excluir" colado no
    // "editar". O que NÃO muda é a garantia: toda porta de entrada de ação diz
    // de qual cupom se trata.
    const editar = await screen.findAllByRole('button', { name: /Editar cupom TESTE10/i });
    const excluir = await screen.findAllByRole('button', { name: /Excluir cupom TESTE10/i });
    const kebab = await screen.findAllByRole('button', { name: /Ações do cupom TESTE10/i });

    expect(editar).toHaveLength(1);
    expect(excluir).toHaveLength(1);
    expect(kebab).toHaveLength(1);
  });

  it('o menu de ações da linha nomeia o cupom, e não só a ação', async () => {
    // Dentro do menu os itens são "Editar"/"Excluir". Isso só é aceitável
    // porque o MENU carrega o código — senão o leitor de tela anuncia
    // "Editar" sem dizer de quê, que é o mesmo defeito dos ícones nus.
    renderPage();
    const kebab = await screen.findByRole('button', { name: /Ações do cupom TESTE10/i });
    fireEvent.click(kebab);

    const menu = screen.getByRole('menu', { name: /Ações do cupom TESTE10/i });
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('não deixa botões de ação com nome genérico "Editar"/"Excluir" sem contexto', async () => {
    renderPage();
    await waitFor(() => expect(mockedService.getCoupons).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /^Editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Excluir$/i })).toBeNull();
  });
});
