import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PdvBalcaoPage from '../PdvBalcaoPage';
import { getProducts, updateProduct } from '../../../services/storesApi';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/storesApi', () => ({
  getProducts: jest.fn(),
  updateProduct: jest.fn(),
}));
jest.mock('../../../services/orders', () => ({
  ordersService: {
    createOrder: jest.fn(),
    markPaid: jest.fn(),
  },
}));

const mockedGetProducts = getProducts as jest.Mock;
const mockedUpdateProduct = updateProduct as jest.Mock;
const mockedCreate = ordersService.createOrder as jest.Mock;
const mockedMarkPaid = ordersService.markPaid as jest.Mock;

const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  store: 's1',
  name: 'Marmita P',
  slug: 'marmita-p',
  sku: 'MP1',
  barcode: '2000042003501',
  price: 20,
  track_stock: true,
  stock_quantity: 10,
  status: 'active',
  ...over,
});

const scan = (code: string) => {
  act(() => {
    [...code, 'Enter'].forEach((key) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  });
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-1/pdv']}>
      <Routes>
        <Route path="/stores/:storeId/pdv" element={<PdvBalcaoPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PdvBalcaoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetProducts.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [product(), product({ id: 'p2', name: 'Suco', slug: 'suco', sku: 'SU1', barcode: '789100000001', price: 8 })],
    });
  });

  it('bipe adiciona o produto na comanda e soma o total', async () => {
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501');
    expect(await screen.findByText('Marmita P')).toBeInTheDocument();

    // bipe repetido intencional: >300ms depois (dentro da janela é ignorado, anti-duplo)
    await act(() => new Promise((r) => setTimeout(r, 320)));
    scan('2000042003501');
    await waitFor(() => {
      expect(screen.getByTestId('pdv-total')).toHaveTextContent('40,00');
    });
  });

  it('código desconhecido abre modal de vínculo e vincula produto', async () => {
    mockedUpdateProduct.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('999888777');
    expect(await screen.findByText('Código não cadastrado')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Suco'));
    await waitFor(() => {
      expect(mockedUpdateProduct).toHaveBeenCalledWith('p2', { barcode: '999888777' });
    });
    expect(screen.getByTestId('pdv-total')).toHaveTextContent('8,00');
  });

  it('finalizar venda cria pedido pickup silencioso e marca pago (dinheiro)', async () => {
    mockedCreate.mockResolvedValue({ id: 'o1' });
    mockedMarkPaid.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501');
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByTestId('pdv-finalizar'));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          store: 'loja-1',
          delivery_method: 'pickup',
          payment_method: 'cash',
          suppress_notifications: true,
          items: [{ product_id: 'p1', quantity: 1 }],
        }),
      );
    });
    await waitFor(() => expect(mockedMarkPaid).toHaveBeenCalledWith('o1', 'loja-1'));
  });
});
