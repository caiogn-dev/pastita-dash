/**
 * "Sugestões": o que o atendimento aprendeu de conversas que viraram pedido
 * sem atendente. Só entra na IA quando o dono aprova (06/10 — antes o
 * extraído sozinho ia direto para o prompt e ensinava promoção velha e erro).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const sugestoes = { listar: jest.fn(), aprovar: jest.fn(), apagar: jest.fn() };
jest.mock('../../../services/atendimentoBot', () => ({
  __esModule: true,
  conhecimentoService: {
    listarSugestoes: (...a: unknown[]) => sugestoes.listar(...a),
    aprovar: (...a: unknown[]) => sugestoes.aprovar(...a),
    apagar: (...a: unknown[]) => sugestoes.apagar(...a),
  },
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'loja-1' }),
}));

import { SugestoesDoBotSecao } from '../SugestoesDoBotSecao';

const SUGESTAO = {
  id: 's1', topic: 'entrega', example_input: 'vocês entregam na região sul?',
  example_response: 'Entregamos sim em toda a região sul.', notes: '', is_active: false,
  source: 'sugestao', usage_count: 0, created_at: '2026-10-06T12:00:00Z', updated_at: '2026-10-06T12:00:00Z',
};

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><SugestoesDoBotSecao /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => jest.clearAllMocks());

it('lista a pergunta e a resposta sugeridas', async () => {
  sugestoes.listar.mockResolvedValue([SUGESTAO]);
  renderizar();
  // A Tabela desenha a linha duas vezes (mesa e celular).
  expect((await screen.findAllByText('vocês entregam na região sul?')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Entregamos sim em toda a região sul.').length).toBeGreaterThan(0);
  expect(sugestoes.listar).toHaveBeenCalledWith('loja-1');
});

it('aprovar permite editar a resposta e tira da lista', async () => {
  sugestoes.listar.mockResolvedValue([SUGESTAO]);
  sugestoes.aprovar.mockResolvedValue({ ...SUGESTAO, source: 'reviewed', is_active: true });
  renderizar();
  fireEvent.click((await screen.findAllByRole('button', { name: /aprovar/i }))[0]);
  const dialogo = await screen.findByRole('dialog');
  const campo = within(dialogo).getByLabelText(/a ia responde/i);
  fireEvent.change(campo, { target: { value: 'Entregamos sim, em toda a região sul de Palmas.' } });
  fireEvent.click(within(dialogo).getByRole('button', { name: /aprovar/i }));
  await waitFor(() => expect(sugestoes.aprovar).toHaveBeenCalledWith(
    'loja-1', 's1', 'Entregamos sim, em toda a região sul de Palmas.',
  ));
  await waitFor(() => expect(screen.queryAllByText('vocês entregam na região sul?')).toHaveLength(0));
});

it('descartar apaga e tira da lista', async () => {
  sugestoes.listar.mockResolvedValue([SUGESTAO]);
  sugestoes.apagar.mockResolvedValue(undefined);
  renderizar();
  fireEvent.click((await screen.findAllByRole('button', { name: /descartar/i }))[0]);
  await waitFor(() => expect(sugestoes.apagar).toHaveBeenCalledWith('loja-1', 's1'));
  await waitFor(() => expect(screen.queryAllByText('vocês entregam na região sul?')).toHaveLength(0));
});

it('sem sugestões mostra o vazio', async () => {
  sugestoes.listar.mockResolvedValue([]);
  renderizar();
  expect(await screen.findByText(/nenhuma sugestão/i)).toBeInTheDocument();
});
