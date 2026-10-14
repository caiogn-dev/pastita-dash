/**
 * Molde "Lista + painel" (14/10): o cupom abre AO LADO da lista, não numa
 * janela por cima. A lista fica à vista, o cupom escolhido vive na URL
 * (`?cupom=<id>` | `?cupom=novo`) e sobrevive a recarregar.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
    getCoupon: jest.fn(),
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
  usage_limit_per_user: null,
  used_count: 0,
  is_active: true,
  is_valid_now: true,
  first_order_only: false,
  parceiro_phone: '',
  parceiro_percent: '',
  applicable_categories: [],
  valid_from: '2026-01-01',
  valid_until: '2026-12-31',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const Local: React.FC = () => <div data-testid="local">{useLocation().search}</div>;

function renderPage(url = '/stores/store-1/coupons') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CouponsPage />
      <Local />
    </MemoryRouter>
  );
}

describe('CouponsPage — lista + painel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getCoupons.mockResolvedValue({
      count: 1, next: null, previous: null, results: [coupon],
    } as never);
    mockedService.getStats.mockResolvedValue({} as never);
    mockedService.getCoupon.mockRejectedValue(new Error('404'));
    mockedService.createCoupon.mockResolvedValue({} as never);
    mockedService.updateCoupon.mockResolvedValue({} as never);
  });

  it('abrir um cupom mostra o painel ao lado, sem janela por cima e sem perder a lista', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByLabelText('Abrir cupom TESTE10'))[0]);

    const painel = await screen.findByRole('complementary', { name: /Editar cupom/i });
    expect(within(painel).getByLabelText('Código')).toHaveValue('TESTE10');
    expect(screen.queryByRole('dialog')).toBeNull();
    // A lista continua na tela.
    expect(screen.getAllByLabelText('Abrir cupom TESTE10').length).toBeGreaterThan(0);
    // O cupom escolhido vai para a URL.
    expect(screen.getByTestId('local')).toHaveTextContent('?cupom=coupon-1');
  });

  it('?cupom=<id> na URL abre o cupom ao recarregar', async () => {
    renderPage('/stores/store-1/coupons?cupom=coupon-1');
    const painel = await screen.findByRole('complementary', { name: /Editar cupom/i });
    expect(within(painel).getByLabelText('Código')).toHaveValue('TESTE10');
  });

  it('?cupom=novo abre a criação, com um botão principal "Criar cupom"', async () => {
    renderPage('/stores/store-1/coupons?cupom=novo');
    const painel = await screen.findByRole('complementary', { name: /Novo cupom/i });
    expect(within(painel).getByRole('button', { name: 'Criar cupom' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Novo cupom" põe ?cupom=novo na URL e "Voltar" tira', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole('button', { name: /Novo cupom/ }))[0]);
    await screen.findByRole('complementary', { name: /Novo cupom/i });
    expect(screen.getByTestId('local')).toHaveTextContent('?cupom=novo');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByTestId('local')).toHaveTextContent('');
    expect(screen.getByTestId('local')).not.toHaveTextContent('cupom');
  });

  it('criar manda ao service o mesmo payload de antes', async () => {
    renderPage('/stores/store-1/coupons?cupom=novo');
    const painel = await screen.findByRole('complementary', { name: /Novo cupom/i });

    fireEvent.change(within(painel).getByLabelText('Código'), { target: { value: 'promo15' } });
    fireEvent.change(within(painel).getByLabelText('Valor do desconto'), { target: { value: '15' } });
    fireEvent.click(within(painel).getByRole('button', { name: 'Criar cupom' }));

    await waitFor(() => expect(mockedService.createCoupon).toHaveBeenCalledTimes(1));
    expect(mockedService.createCoupon).toHaveBeenCalledWith({
      store: 'store-1',
      code: 'PROMO15',
      description: '',
      discount_type: 'percentage',
      discount_value: 15,
      min_purchase: 0,
      max_discount: null,
      usage_limit: null,
      usage_limit_per_user: null,
      first_order_only: false,
      parceiro_phone: '',
      parceiro_percent: '',
      applicable_categories: [],
      is_active: true,
      valid_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      valid_until: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('salvar um cupom existente manda o payload de antes e mantém o painel aberto na lista', async () => {
    renderPage('/stores/store-1/coupons?cupom=coupon-1');
    const painel = await screen.findByRole('complementary', { name: /Editar cupom/i });

    fireEvent.change(within(painel).getByLabelText('Valor do desconto'), { target: { value: '20' } });
    fireEvent.click(within(painel).getByRole('button', { name: 'Salvar cupom' }));

    await waitFor(() => expect(mockedService.updateCoupon).toHaveBeenCalledTimes(1));
    expect(mockedService.updateCoupon).toHaveBeenCalledWith('coupon-1', {
      store: 'store-1',
      code: 'TESTE10',
      description: 'Cupom de teste',
      discount_type: 'percentage',
      discount_value: 20,
      min_purchase: 0,
      max_discount: null,
      usage_limit: null,
      usage_limit_per_user: null,
      first_order_only: false,
      parceiro_phone: '',
      parceiro_percent: '',
      applicable_categories: [],
      is_active: true,
      valid_from: '2026-01-01',
      valid_until: '2026-12-31',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('valor fixo usa o campo de dinheiro e envia número, não texto', async () => {
    renderPage('/stores/store-1/coupons?cupom=novo');
    const painel = await screen.findByRole('complementary', { name: /Novo cupom/i });

    fireEvent.change(within(painel).getByLabelText('Tipo de desconto'), { target: { value: 'fixed' } });
    fireEvent.change(within(painel).getByLabelText('Código'), { target: { value: 'ABC' } });
    fireEvent.change(within(painel).getByLabelText('Valor do desconto'), { target: { value: '1990' } });
    fireEvent.change(within(painel).getByLabelText('Compra mínima'), { target: { value: '5000' } });
    fireEvent.click(within(painel).getByRole('button', { name: 'Criar cupom' }));

    await waitFor(() => expect(mockedService.createCoupon).toHaveBeenCalled());
    expect(mockedService.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ discount_type: 'fixed', discount_value: 19.9, min_purchase: 50 })
    );
  });

  it('sem código ou valor não salva e marca o campo', async () => {
    renderPage('/stores/store-1/coupons?cupom=novo');
    const painel = await screen.findByRole('complementary', { name: /Novo cupom/i });

    fireEvent.click(within(painel).getByRole('button', { name: 'Criar cupom' }));

    expect(mockedService.createCoupon).not.toHaveBeenCalled();
    expect(within(painel).getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true');
  });

  it('cupom que não existe na lista não deixa painel preso: some e limpa a URL', async () => {
    renderPage('/stores/store-1/coupons?cupom=fantasma');
    await waitFor(() => expect(mockedService.getCoupons).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('local')).not.toHaveTextContent('cupom'));
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
