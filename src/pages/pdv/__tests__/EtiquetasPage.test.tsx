import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EtiquetasPage from '../EtiquetasPage';
import { getStores, getProducts, updateProduct } from '../../../services/storesApi';
import { printHtmlDocument } from '../../../utils/labelPrint';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue({ data: { results: [] } }) },
  normalizePaginatedResponse: (data: { results?: unknown[] }) => data?.results || [],
}));

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  getProducts: jest.fn(),
  updateProduct: jest.fn(),
}));

jest.mock('../../../utils/labelPrint', () => ({
  ...jest.requireActual('../../../utils/labelPrint'),
  printHtmlDocument: jest.fn().mockResolvedValue(undefined),
}));

const mockedGetStores = getStores as jest.Mock;
const mockedGetProducts = getProducts as jest.Mock;
const mockedUpdateProduct = updateProduct as jest.Mock;
const mockedPrint = printHtmlDocument as jest.Mock;

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
    localStorage.clear();
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
    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('Marmita P');
    // duas cópias = duas páginas, cada uma com o código novo
    expect(doc.match(/class="page"/g)).toHaveLength(2);
    const code = mockedUpdateProduct.mock.calls[0][1].barcode as string;
    expect(doc).toContain('@page { size: 100mm 80mm; margin: 0; }');
    // barcode entra como SVG gerado a partir do código salvo
    expect(mockedPrint).toHaveBeenCalledTimes(1);
    expect(code).toMatch(/^2\d{12}$/);
  });

  it('produto que já tem código não é alterado ao imprimir', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    expect(mockedUpdateProduct).not.toHaveBeenCalled();
  });

  it('exporta folha A4 organizada sem gerar código para produto vazio', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByRole('button', { name: /^Folha de códigos/ }));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('@page { size: A4 portrait;');
    expect(doc).toContain('Loja Um');
    expect(doc).toContain('Marmita P');
    expect(doc).toContain('Sem código');
    expect(doc).toContain('Suco');
    expect(doc).toContain('7891000000014');
    expect(mockedUpdateProduct).not.toHaveBeenCalled();
  });

  it('modo validade imprime linhas de 3 colunas com página do tamanho do papel', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByText('Validade (Elgin)'));
    expect(screen.getByTestId('etq-shelf-days')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '4');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    expect(mockedUpdateProduct).not.toHaveBeenCalled();

    const doc = mockedPrint.mock.calls[0][0] as string;
    // bobina padrão 107mm (3×33 + 2×3 = 105 centralizado), 4 etiquetas → 2 páginas (3+1)
    expect(doc).toContain('@page { size: 107mm 22mm; margin: 0; }');
    expect(doc.match(/class="page"/g)).toHaveLength(2);
    expect(doc.match(/class="cell"/g)).toHaveLength(4);
    // margem automática de 1mm por lado → colunas em 1/37/73 mm
    expect(doc).toContain('left:1mm');
    expect(doc).toContain('left:37mm');
    expect(doc).toContain('left:73mm');
    expect(doc).toContain('Manip.:');
    expect(doc).toContain('Val.:');
  });

  it('borda retângulo entra no CSS da etiqueta quando selecionada', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.click(screen.getByText('Validade (Elgin)'));
    await userEvent.selectOptions(screen.getByTestId('etq-border'), 'solid');
    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('border: 0.4mm solid #000');
  });

  it('girar 90° troca a orientação da página da etiqueta de produto', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.click(screen.getByTestId('etq-rotate'));
    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('@page { size: 80mm 100mm; margin: 0; }');
    expect(doc).toContain('rotate(90deg)');
  });
});
