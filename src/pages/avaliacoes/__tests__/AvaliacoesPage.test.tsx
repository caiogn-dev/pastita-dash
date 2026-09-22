/**
 * A tela de avaliações é sobre PRODUTO primeiro.
 *
 * Decisão do dono (21/09): "prefiro a avaliação do produto do que a geral".
 * A nota geral da loja vira número de vitrine; o que muda decisão é saber
 * QUAL prato decepcionou. Por isso o ranking de produtos vem antes da lista,
 * e a lista existe para ler o que a pessoa escreveu.
 *
 * E o formulário da casa só recebe 3 estrelas ou menos — de 4 para cima o
 * cliente vai para o Google. Então estas avaliações são, por construção, as
 * que têm algo a consertar.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AvaliacoesPage from '../AvaliacoesPage';

const listar = jest.fn();
const relatorio = jest.fn();

jest.mock('../../../services/avaliacoes', () => ({
  __esModule: true,
  avaliacoesService: { listar: (...a: unknown[]) => listar(...a) },
}));
jest.mock('../../../services/reports', () => ({
  __esModule: true,
  getAnalyticsReport: (...a: unknown[]) => relatorio(...a),
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'ce-saladas' }, isStoreSelected: true }),
}));

const RESUMO = {
  summary: { avg_rating: 4.92, count: 77 },
  distribution: [{ rating: 5, count: 72 }, { rating: 2, count: 2 }],
  by_product: [
    { product_name: 'Salada Camarão', avg_rating: 2.5, count: 4 },
    { product_name: 'Salada Frango', avg_rating: 4.8, count: 20 },
  ],
  pilares: [
    { chave: 'entrega', rotulo: 'Tempo de entrega', media: 4.2, total: 31 },
    { chave: 'comida', rotulo: 'Qualidade da comida', media: 4.9, total: 40 },
  ],
};

const LISTA = [
  {
    id: 'a1', order: 'o1', order_number: 'CE-123', rating: 2, comment: 'Demorou demais',
    rating_comida: 5, rating_entrega: 1, rating_atendimento: 4,
    customer_name: 'Ana', created_at: '2026-09-20T12:00:00Z',
    items: [{ product_name: 'Salada Camarão', rating: 2 }],
  },
  {
    id: 'a2', order: 'o2', order_number: 'CE-124', rating: 5, comment: '',
    rating_comida: null, rating_entrega: null, rating_atendimento: null,
    customer_name: 'Bia', created_at: '2026-09-21T12:00:00Z', items: [],
  },
];

const tela = () => render(<MemoryRouter><AvaliacoesPage /></MemoryRouter>);

beforeEach(() => {
  listar.mockReset().mockResolvedValue(LISTA);
  relatorio.mockReset().mockResolvedValue(RESUMO);
});

it('o produto pior avaliado vem primeiro, com a nota e o volume', async () => {
  tela();

  await screen.findByText('Como cada prato foi avaliado');
  const ranking = screen.getByText('Como cada prato foi avaliado').closest('section');
  const nomes = [...ranking.querySelectorAll('li')].map((li) => li.textContent);
  expect(nomes[0]).toContain('Salada Camarão');
  expect(nomes[0]).toContain('2,5');
  expect(nomes[0]).toContain('4 avaliações');
});

it('mostra o pilar mais fraco, que é o que dá para consertar', async () => {
  tela();

  expect(await screen.findByText(/Tempo de entrega/)).toBeInTheDocument();
});

it('lista cada avaliação com cliente, pedido e o que escreveram', async () => {
  tela();

  expect(await screen.findByText('Demorou demais')).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByText(/CE-123/)).toBeInTheDocument();
});

it('avaliação sem comentário não vira linha muda', async () => {
  tela();

  expect(await screen.findByText(/deu a nota e não escreveu/)).toBeInTheDocument();
});

it('filtrar por nota pede ao servidor só aquela nota', async () => {
  const user = userEvent.setup();
  tela();
  await screen.findByText('Demorou demais');

  await user.click(screen.getByRole('button', { name: '2 estrelas' }));

  expect(listar).toHaveBeenLastCalledWith('ce-saladas', 2);
});

it('sem avaliação nenhuma, explica o que traz avaliação', async () => {
  listar.mockResolvedValue([]);
  relatorio.mockResolvedValue({ summary: { avg_rating: null, count: 0 }, distribution: [], by_product: [] });

  tela();

  expect(await screen.findByText(/Nenhuma avaliação ainda/)).toBeInTheDocument();
});
