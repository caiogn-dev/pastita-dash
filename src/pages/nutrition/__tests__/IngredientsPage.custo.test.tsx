import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  getErrorMessage: () => 'erro',
  normalizePaginatedResponse: (d: unknown) => {
    if (d && typeof d === 'object' && 'results' in (d as Record<string, unknown>)) {
      return (d as { results: unknown[] }).results;
    }
    return Array.isArray(d) ? d : [];
  },
}));
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getStores: jest.fn().mockResolvedValue({ results: [{ id: 's1', slug: 'loja' }] }),
  getProducts: jest.fn().mockResolvedValue({ results: [] }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import api from '../../../services/api';
import IngredientsPage from '../IngredientsPage';

const apiGet = api.get as jest.Mock;
const queijo = {
  id: 'i1', store: 's1', display_name: 'Queijo', canonical_name: 'Queijo', category: 'Laticínios',
  source: 'manual', default_unit: 'g', density_g_ml: null, allergens: [], may_contain: [], allergens_reviewed: true,
  preco_pago: null, quantidade_comprada: null, unidade_compra: '', quantidade_por_unidade: null,
};

beforeEach(() => {
  apiGet.mockReset();
  (api.patch as jest.Mock).mockReset().mockResolvedValue({ data: {} });
  apiGet.mockImplementation((url: string, cfg?: { params?: { escopo?: string } }) => {
    if (url === '/nutrition/ingredients/' && cfg?.params?.escopo === 'loja') return Promise.resolve({ data: { results: [queijo] } });
    if (url === '/nutrition/custos/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { results: [], count: 0 } });
  });
});

const abrirPagina = () => render(
  <MemoryRouter initialEntries={['/stores/loja/ingredientes']}>
    <Routes><Route path="/stores/:storeId/ingredientes" element={<IngredientsPage />} /></Routes>
  </MemoryRouter>,
);

test('no ingrediente da loja, "Paguei R$ __ por __" mostra o custo por kg e vai no salvar', async () => {
  abrirPagina();
  const linhas = await screen.findAllByText('Queijo');
  fireEvent.click(linhas[0]);
  const modal = await screen.findByRole('dialog');
  fireEvent.change(within(modal).getByLabelText('Paguei (R$)'), { target: { value: '30' } });
  fireEvent.change(within(modal).getByLabelText('Quantidade comprada'), { target: { value: '1000' } });
  expect(within(modal).getByText(/R\$ 30,00 por kg/)).toBeInTheDocument();
  fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  const [, corpo] = (api.patch as jest.Mock).mock.calls[0];
  expect(corpo).toMatchObject({ preco_pago: '30', quantidade_comprada: '1000', unidade_compra: 'g', quantidade_por_unidade: null });
});

test('ingrediente sem preço manda o preço vazio, não zero', async () => {
  abrirPagina();
  fireEvent.click((await screen.findAllByText('Queijo'))[0]);
  const modal = await screen.findByRole('dialog');
  fireEvent.click(within(modal).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  const [, corpo] = (api.patch as jest.Mock).mock.calls[0];
  expect(corpo).toMatchObject({ preco_pago: null, quantidade_comprada: null, unidade_compra: '' });
});

test('a aba "Custo e margem" lê o resumo de custos da loja', async () => {
  abrirPagina();
  fireEvent.click(await screen.findByRole('tab', { name: /Custo e margem/ }));
  await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/nutrition/custos/', { params: { store: 's1' } }));
});
