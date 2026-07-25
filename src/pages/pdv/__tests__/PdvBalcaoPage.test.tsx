import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PdvBalcaoPage from '../PdvBalcaoPage';
import { getStores, getProducts, updateProduct, getCustomers } from '../../../services/storesApi';
import { ordersService } from '../../../services/orders';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  getProducts: jest.fn(),
  updateProduct: jest.fn(),
  getCustomers: jest.fn(),
}));
jest.mock('../../../services/orders', () => ({
  ordersService: {
    createOrder: jest.fn(),
    markPaid: jest.fn(),
    getOrder: jest.fn(),
  },
}));

const mockedGetStores = getStores as jest.Mock;
const mockedGetCustomers = getCustomers as jest.Mock;
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

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

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
    mockedGetStores.mockResolvedValue(page([
      { id: 's1', slug: 'loja-1', name: 'Loja Um', status: 'active' },
      { id: 's2', slug: 'loja-2', name: 'Loja Dois', status: 'active' },
    ]));
    // catálogo por loja: loja-1 tem Marmita+Suco, loja-2 tem Salgadinho
    mockedGetProducts.mockImplementation(async ({ store }: { store: string }) => (
      store === 'loja-2'
        ? page([product({ id: 'p9', store: 's2', name: 'Salgadinho', slug: 'salgadinho', sku: 'SG1', barcode: '789200000002', price: 5 })])
        : page([
          product(),
          product({ id: 'p2', name: 'Suco', slug: 'suco', sku: 'SU1', barcode: '789100000001', price: 8 }),
        ])
    ));
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
    mockedCreate.mockResolvedValue({ id: 'o1', total: 20 });
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

  it('busca manual adiciona produto sem leitor', async () => {
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    await userEvent.type(screen.getByTestId('pdv-busca-manual'), 'suco');
    await userEvent.click(await screen.findByText('Suco'));
    await waitFor(() => {
      expect(screen.getByTestId('pdv-total')).toHaveTextContent('8,00');
    });
  });

  it('toggle "Imprimir cupom" manda print_receipt no pedido', async () => {
    mockedCreate.mockResolvedValue({ id: 'o1', total: 20 });
    mockedMarkPaid.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501');
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByTestId('pdv-cupom'));
    await userEvent.click(screen.getByTestId('pdv-finalizar'));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ print_receipt: true }),
      );
    });
  });

  it('comanda com lojas misturadas gera um pedido por loja', async () => {
    mockedCreate.mockImplementation(async ({ store }: { store: string }) => ({ id: `o-${store}`, total: 1 }));
    mockedMarkPaid.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501'); // loja-1
    await screen.findByText('Marmita P');
    await act(() => new Promise((r) => setTimeout(r, 320)));
    scan('789200000002'); // loja-2
    await screen.findByText('Salgadinho');

    // agrupamento visível por loja
    expect(screen.getByText('Loja Um')).toBeInTheDocument();
    expect(screen.getByText('Loja Dois')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('pdv-finalizar'));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
      store: 'loja-1', items: [{ product_id: 'p1', quantity: 1 }],
    }));
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
      store: 'loja-2', items: [{ product_id: 'p9', quantity: 1 }],
    }));
    await waitFor(() => expect(mockedMarkPaid).toHaveBeenCalledTimes(2));
  });

  it('vincular cliente manda nome e telefone reais no pedido', async () => {
    mockedGetCustomers.mockResolvedValue(page([{
      id: 'c1', user_name: 'João da Silva', user_email: 'joao@x.com',
      phone: '63992001122', whatsapp: '', total_orders: 3,
    }]));
    mockedCreate.mockResolvedValue({ id: 'o1', total: 20 });
    mockedMarkPaid.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501');
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByText('Vincular cliente'));
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou telefone…'), 'joão');
    await userEvent.click(await screen.findByText('João da Silva'));

    // chip do cliente visível no fechamento
    expect(screen.getByTestId('pdv-cliente')).toHaveTextContent('João da Silva');

    await userEvent.click(screen.getByTestId('pdv-finalizar'));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
        customer_name: 'João da Silva',
        customer_phone: '63992001122',
        customer_email: 'joao@x.com',
      }));
    });
  });

  it('venda PIX abre modal de cobrança com QR e não marca pago', async () => {
    mockedCreate.mockResolvedValue({
      id: 'o1', total: 20, order_number: 'PED1',
      pix_code: 'PIXCOPIAECOLA', pix_qr_code: 'QRBASE64', payment_status: 'pending',
    });
    renderPage();
    await waitFor(() => expect(mockedGetProducts).toHaveBeenCalled());

    scan('2000042003501');
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByText('PIX'));
    await userEvent.click(screen.getByTestId('pdv-finalizar'));

    expect(await screen.findByText('Cobrança PIX')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code PIX de Loja Um')).toHaveAttribute(
      'src', 'data:image/png;base64,QRBASE64',
    );
    expect(screen.getByText('Copiar código PIX')).toBeInTheDocument();
    expect(mockedMarkPaid).not.toHaveBeenCalled();
  });
});
