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

  it('celular e desktop oferecem a MESMA ação, com o cupom no nome', async () => {
    renderPage();

    // Antes eram duas listas escritas à mão no mesmo arquivo, e elas divergiam
    // na ação: no cartão do celular, dois ícones nus (lápis e lixeira) coladinhos
    // — a lixeira exatamente onde o polegar cai ao rolar; na linha do desktop,
    // um kebab. Hoje as duas apresentações saem da mesma definição de coluna,
    // então a ação é uma só. O jsdom não aplica CSS, então as duas aparecem;
    // no navegador, `md:hidden` esconde a que não é da vez, do olho e do
    // leitor de tela.
    const kebab = await screen.findAllByRole('button', { name: /Ações do cupom TESTE10/i });
    expect(kebab).toHaveLength(2);

    // E o destrutivo não fica mais solto na superfície do cartão.
    expect(screen.queryByRole('button', { name: /Excluir cupom TESTE10/i })).toBeNull();
  });

  it('o menu de ações da linha nomeia o cupom, e não só a ação', async () => {
    // Dentro do menu os itens são "Editar"/"Excluir". Isso só é aceitável
    // porque o MENU carrega o código — senão o leitor de tela anuncia
    // "Editar" sem dizer de quê, que é o mesmo defeito dos ícones nus.
    renderPage();
    const kebab = (await screen.findAllByRole('button', { name: /Ações do cupom TESTE10/i }))[0];
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
