import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
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
const mockedToast = toast as jest.Mocked<typeof toast>;

function renderPage() {
  return render(
    <MemoryRouter>
      <CouponsPage />
    </MemoryRouter>
  );
}

describe('CouponsPage — feedback de erro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getCoupons.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    } as never);
    mockedService.getStats.mockResolvedValue({} as never);
  });

  it('mostra toast de erro quando salvar cupom falha (não pode ser silencioso)', async () => {
    mockedService.createCoupon.mockRejectedValue(new Error('code: cupom duplicado'));
    renderPage();

    const newButtons = await screen.findAllByText('Novo Cupom');
    fireEvent.click(newButtons[0]);

    fireEvent.change(screen.getByPlaceholderText('Ex: DESCONTO10'), {
      target: { value: 'TESTE10' },
    });
    // Primeiro input numérico do modal = Valor do Desconto
    fireEvent.change(screen.getAllByRole('spinbutton')[0], {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringContaining('cupom duplicado')
      );
    });
  });

  it('mostra toast de erro quando o carregamento de cupons falha', async () => {
    mockedService.getCoupons.mockRejectedValue(new Error('network'));
    renderPage();

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith('Erro ao carregar cupons');
    });
  });
});
