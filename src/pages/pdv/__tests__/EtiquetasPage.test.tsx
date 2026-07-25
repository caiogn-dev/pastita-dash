import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EtiquetasPage from '../EtiquetasPage';
import { getStores, getProducts, updateProduct } from '../../../services/storesApi';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  getProducts: jest.fn(),
  updateProduct: jest.fn(),
}));

const mockedGetStores = getStores as jest.Mock;
const mockedGetProducts = getProducts as jest.Mock;
const mockedUpdateProduct = updateProduct as jest.Mock;

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-1/etiquetas']}>
      <Routes>
        <Route path="/stores/:storeId/etiquetas" element={<EtiquetasPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('EtiquetasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.print = jest.fn();
    mockedGetStores.mockResolvedValue(page([
      { id: 's1', slug: 'loja-1', name: 'Loja Um', status: 'active' },
    ]));
    mockedGetProducts.mockResolvedValue(page([
      {
        id: 'p1', store: 's1', name: 'Marmita P', slug: 'marmita-p', sku: '',
        barcode: '', price: 20, status: 'active', description: '', short_description: '',
      },
      {
        id: 'p2', store: 's1', name: 'Suco', slug: 'suco', sku: '',
        barcode: '7891000000014', price: 8, status: 'active', description: '', short_description: '',
      },
    ]));
    mockedUpdateProduct.mockResolvedValue({});
  });

  it('imprimir etiqueta de produto gera EAN-13 interno pra quem não tem código', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '2');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => {
      expect(mockedUpdateProduct).toHaveBeenCalledWith('p1', {
        barcode: expect.stringMatching(/^2\d{12}$/),
      });
    });
    await waitFor(() => expect(window.print).toHaveBeenCalled());
  });

  it('produto que já tem código não é alterado ao imprimir', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(window.print).toHaveBeenCalled());
    expect(mockedUpdateProduct).not.toHaveBeenCalled();
  });

  it('modo validade mostra config de shelf-life e não mexe em código', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByText('Validade (Elgin)'));
    expect(screen.getByTestId('etq-shelf-days')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '3');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(window.print).toHaveBeenCalled());
    expect(mockedUpdateProduct).not.toHaveBeenCalled();
  });
});
