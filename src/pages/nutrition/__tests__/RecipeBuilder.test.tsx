import { render, screen, waitFor } from '@testing-library/react';

// O painel de receita monta várias queries ao abrir um produto. Este mock deixa
// contar exatamente quais endpoints são chamados e quantas vezes.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  normalizePaginatedResponse: (d: unknown) => {
    if (d && typeof d === 'object' && 'results' in (d as Record<string, unknown>)) {
      return (d as { results: unknown[] }).results;
    }
    return Array.isArray(d) ? d : [];
  },
}));
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getProducts: jest.fn().mockResolvedValue({ results: [] }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import api from '../../../services/api';
import RecipeBuilder from '../RecipeBuilder';

const apiGet = api.get as jest.Mock;

const receitaSalva = {
  id: 'r1',
  serving_size_g: '100',
  household_measure: '1 unidade',
  status: 'estimated',
  items: [{ ingredient: 'i1', quantity_g: '50' }],
};

beforeEach(() => {
  (api.get as jest.Mock).mockReset();
  (api.post as jest.Mock).mockReset();
  (api.patch as jest.Mock).mockReset();
  apiGet.mockImplementation((url: string) => {
    if (url === '/nutrition/recipes/') return Promise.resolve({ data: { results: [receitaSalva] } });
    if (url === '/nutrition/profiles/') return Promise.resolve({ data: { results: [] } });
    if (url.startsWith('/nutrition/ingredients/')) return Promise.resolve({ data: { display_name: 'Farinha' } });
    return Promise.resolve({ data: { results: [] } });
  });
});

test('carrega a receita do produto com uma única chamada ao endpoint de receitas', async () => {
  render(<RecipeBuilder productId="p1" ingredients={[]} />);

  // O nome do ingrediente é resolvido a partir da MESMA resposta da receita,
  // então esperamos que apareça na tela sem uma segunda ida ao mesmo endpoint.
  await waitFor(() => expect(screen.getAllByText("Farinha").length).toBeGreaterThan(0));

  const chamadasDeReceita = apiGet.mock.calls.filter((c) => c[0] === '/nutrition/recipes/');
  expect(chamadasDeReceita).toHaveLength(1);
});

test('resolve o nome do ingrediente da receita salva', async () => {
  render(<RecipeBuilder productId="p1" ingredients={[]} />);
  await waitFor(() => expect(screen.getAllByText("Farinha").length).toBeGreaterThan(0));
  expect(apiGet).toHaveBeenCalledWith('/nutrition/ingredients/i1/');
});
