/**
 * Rastreabilidade do lote (Agrião, 09/10): procurar pelo código que está na
 * etiqueta e ver prato, fabricação, validade e quantas etiquetas saíram.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LotesPage from '../LotesPage';
import { listarLotes } from '../../../services/printing';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  normalizePaginatedResponse: (data: { results?: unknown[] }) => data?.results || [],
}));
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listarLotes: jest.fn(),
}));
const mockedListar = listarLotes as jest.Mock;

const lote = (codigo: string, nome: string) => ({
  id: codigo, codigo, produto_nome: nome, product: 'p1',
  fabricacao: '2026-10-09', validade: '2027-01-07', etiquetas: 14, criado_em: '2026-10-09T15:00:00Z',
});

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/stores/agriao/lotes']}>
      <Routes><Route path="/stores/:storeId/lotes" element={<LotesPage />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('LotesPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lista os lotes da loja com prato, datas e etiquetas', async () => {
    mockedListar.mockResolvedValue({ data: { count: 1, next: null, results: [lote('EST-09102601', 'Estrogonofe de Frango')] } });
    renderPage();
    expect((await screen.findAllByText('EST-09102601')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estrogonofe de Frango').length).toBeGreaterThan(0);
    expect(screen.getAllByText('09/10/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('07/01/2027').length).toBeGreaterThan(0);
    expect(mockedListar).toHaveBeenCalledWith(expect.objectContaining({ store: 'agriao' }));
  });

  it('busca pelo código impresso na etiqueta', async () => {
    mockedListar.mockResolvedValue({ data: { count: 0, next: null, results: [] } });
    renderPage();
    await userEvent.type(await screen.findByLabelText('Buscar lote ou prato'), 'EST-0910');
    await waitFor(() => expect(mockedListar).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'EST-0910' })));
  });

  it('falha ao carregar não vira lista vazia', async () => {
    mockedListar.mockRejectedValue(new Error('rede'));
    renderPage();
    expect(await screen.findByText(/Não consegui carregar os lotes/)).toBeInTheDocument();
  });
});
