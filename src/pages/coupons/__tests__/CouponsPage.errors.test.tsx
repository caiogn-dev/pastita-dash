import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
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

    fireEvent.click((await screen.findAllByText('Novo cupom'))[0]);

    fireEvent.change(screen.getByPlaceholderText('Ex: DESCONTO10'), {
      target: { value: 'TESTE10' },
    });
    fireEvent.change(screen.getByLabelText('Valor do desconto'), {
      target: { value: '10' },
    });
    // Painel ao lado (sem assistente de passos): um botão só, que salva.
    fireEvent.click(screen.getByRole('button', { name: 'Criar cupom' }));

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringContaining('cupom duplicado')
      );
    });
  });

  it('não salva sem código nem valor — o cupom não existe sem os dois', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByText('Novo cupom'))[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Criar cupom' }));

    expect(mockedToast.error).toHaveBeenCalledWith(expect.stringContaining('código'));
    expect(mockedService.createCoupon).not.toHaveBeenCalled();
  });

  it('mostra toast de erro quando o carregamento de cupons falha', async () => {
    mockedService.getCoupons.mockRejectedValue(new Error('network'));
    renderPage();

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith('Erro ao carregar cupons');
    });
  });

  it('digitar no formulário NÃO dispara aviso de erro a cada tecla (28/09)', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByText('Novo cupom'))[0]);
    const toastErro = (toast as unknown as { error: jest.Mock }).error;
    toastErro.mockClear();

    const codigo = screen.getByPlaceholderText('Ex: DESCONTO10');
    for (const v of ['D', 'DE', 'DES', 'DESC']) {
      fireEvent.change(codigo, { target: { value: v } });
    }

    expect(toastErro).not.toHaveBeenCalled();
    // Só o CLIQUE em salvar com pendência avisa — uma vez.
    fireEvent.click(screen.getByRole('button', { name: 'Criar cupom' }));
    expect(toastErro).toHaveBeenCalledTimes(1);
    expect(toastErro.mock.calls[0][0]).toMatch(/valor do desconto/i);
  });
});
