/**
 * O "vazio enganoso" da tela de avaliações.
 *
 * A carga (`avaliacoesService.listar` + `getAnalyticsReport('reviews')`) roda
 * num `Promise.all`. Quando ela caía (rede/500), a página trocava TODA a área de
 * conteúdo por um parágrafo vermelho cru — "Não foi possível carregar as
 * avaliações agora." — SEM botão de tentar de novo: o lojista só recuperava
 * recarregando a SPA inteira. E se a falha fosse ao ATUALIZAR (trocar o filtro
 * de nota com a lista já na tela), esse mesmo parágrafo apagava a lista que já
 * estava carregada — um vazio enganoso sobre dado que o painel já tinha.
 *
 * Agora:
 *  - falha SEM cache → `FalhaAoCarregar` (role="alert") com "Tentar novamente";
 *  - toda busca vem de trocar a loja ou o filtro: a lista anterior é de OUTRA
 *    seleção, então a falha também cai no erro acionável em vez de deixá-la na tela.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AvaliacoesPage from '../AvaliacoesPage';

const listar = jest.fn();
const relatorio = jest.fn();
const toastError = jest.fn();

jest.mock('../../../services/avaliacoes', () => ({
  __esModule: true,
  avaliacoesService: { listar: (...a: unknown[]) => listar(...a) },
}));
jest.mock('../../../services/reports', () => ({
  __esModule: true,
  getAnalyticsReport: (...a: unknown[]) => relatorio(...a),
}));
jest.mock('../LinkDoGoogle', () => ({ __esModule: true, LinkDoGoogle: () => null }));
let lojaAtual: { slug?: string } | null = { slug: 'ce-saladas' };
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: lojaAtual, isStoreSelected: true }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: (...a: unknown[]) => toastError(...a) },
  toast: { error: (...a: unknown[]) => toastError(...a) },
}));

const RESUMO = {
  summary: { avg_rating: 4.92, count: 77 },
  distribution: [{ rating: 5, count: 72 }],
  by_product: [{ product_name: 'Salada Camarão', avg_rating: 2.5, count: 4 }],
  pilares: [{ chave: 'entrega', rotulo: 'Tempo de entrega', media: 4.2, total: 31 }],
};

const LISTA = [
  {
    id: 'a1', order: 'o1', order_number: 'CE-123', rating: 2, comment: 'Demorou demais',
    rating_comida: 5, rating_entrega: 1, rating_atendimento: 4,
    customer_name: 'Ana', created_at: '2026-09-20T12:00:00Z',
    items: [{ product_name: 'Salada Camarão', rating: 2 }],
  },
];

const ui = () => <MemoryRouter><AvaliacoesPage /></MemoryRouter>;
const tela = () => render(ui());

beforeEach(() => {
  lojaAtual = { slug: 'ce-saladas' };
  listar.mockReset().mockResolvedValue(LISTA);
  relatorio.mockReset().mockResolvedValue(RESUMO);
  toastError.mockReset();
});

it('falha na primeira carga mostra erro acionável, e o retry refaz a busca', async () => {
  const user = userEvent.setup();
  listar.mockRejectedValueOnce(new Error('rede caiu'));
  relatorio.mockRejectedValueOnce(new Error('rede caiu'));

  tela();

  const alerta = await screen.findByRole('alert');
  expect(alerta).toHaveTextContent('Não foi possível carregar as avaliações');
  // Não cai no vazio confiante nem no antigo parágrafo cru sem recuperação.
  expect(screen.queryByText(/Nenhuma avaliação ainda/)).not.toBeInTheDocument();

  // listar/relatorio já estão com o resolve padrão; o retry traz o dado real.
  await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

  expect(await screen.findByText('Demorou demais')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('trocar de loja NÃO deixa a loja anterior ser tratada como cache (vazamento entre lojas)', async () => {
  const { rerender } = render(ui());

  // Loja A carrega normal.
  await screen.findByText('Demorou demais');

  // Troca para a loja B, cuja busca cai.
  lojaAtual = { slug: 'outra-loja' };
  listar.mockReset().mockRejectedValue(new Error('rede caiu'));
  relatorio.mockReset().mockRejectedValue(new Error('rede caiu'));
  rerender(ui());

  // A falha da loja B mostra o erro acionável — e NÃO reexibe a avaliação da
  // loja A como se fosse cache válido da loja B.
  const alerta = await screen.findByRole('alert');
  expect(alerta).toHaveTextContent('Não foi possível carregar as avaliações');
  expect(screen.queryByText('Demorou demais')).not.toBeInTheDocument();
});

it('falha ao trocar o filtro não deixa a lista de outra nota sob o filtro novo', async () => {
  listar.mockResolvedValueOnce(LISTA);
  relatorio.mockResolvedValue(RESUMO);
  tela();
  await screen.findByText('Demorou demais');

  listar.mockRejectedValueOnce(new Error('500'));
  await userEvent.click(screen.getByRole('button', { name: '1 estrela' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações');
  expect(screen.queryByText('Demorou demais')).not.toBeInTheDocument();
});

it('resposta atrasada do filtro anterior não sobrescreve a do filtro atual', async () => {
  relatorio.mockResolvedValue(RESUMO);
  let responderAntiga: (v: unknown) => void = () => undefined;
  listar.mockReturnValueOnce(new Promise((r) => { responderAntiga = r; }));
  tela();

  listar.mockResolvedValueOnce([{ ...LISTA[0], id: 'a2', comment: 'Lista nova' }]);
  await userEvent.click(screen.getByRole('button', { name: '1 estrela' }));
  await screen.findByText('Lista nova');

  responderAntiga(LISTA);
  await waitFor(() => expect(relatorio).toHaveBeenCalledTimes(2));
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.getByText('Lista nova')).toBeInTheDocument();
  expect(screen.queryByText('Demorou demais')).not.toBeInTheDocument();
});
