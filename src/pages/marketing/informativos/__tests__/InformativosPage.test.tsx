/**
 * Informativos — avisos da loja no cardápio (06/10, visto no Prefiro):
 * "fechado no feriado", "novo horário". Com começo e fim; o cliente só vê
 * o que está no ar.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const svc = { listar: jest.fn(), criar: jest.fn(), editar: jest.fn(), apagar: jest.fn() };
jest.mock('../../../../services/informativos', () => ({
  __esModule: true,
  informativosService: {
    listar: (...a: unknown[]) => svc.listar(...a),
    criar: (...a: unknown[]) => svc.criar(...a),
    editar: (...a: unknown[]) => svc.editar(...a),
    apagar: (...a: unknown[]) => svc.apagar(...a),
  },
}));
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'ce-saladas' }),
}));

import { InformativosPage } from '../InformativosPage';

const FERIADO = { id: 'i1', titulo: 'Feriado', texto: 'Fechados dia 12/10.', inicio: null, fim: '2026-10-13T03:00:00Z', ativo: true, estado: 'no_ar' };

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><InformativosPage /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => jest.clearAllMocks());

it('lista os informativos com o estado', async () => {
  svc.listar.mockResolvedValue([FERIADO]);
  renderizar();
  expect((await screen.findAllByText('Feriado')).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/no ar/i).length).toBeGreaterThan(0);
  expect(svc.listar).toHaveBeenCalledWith('ce-saladas');
});

it('cria um informativo com título, texto e fim', async () => {
  svc.listar.mockResolvedValue([]);
  svc.criar.mockResolvedValue(FERIADO);
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /novo informativo/i }));
  const dialogo = await screen.findByRole('dialog');
  fireEvent.change(within(dialogo).getByLabelText(/título/i), { target: { value: 'Feriado' } });
  fireEvent.change(within(dialogo).getByLabelText(/texto/i), { target: { value: 'Fechados dia 12/10.' } });
  fireEvent.change(within(dialogo).getByLabelText(/termina/i), { target: { value: '2026-10-13T00:00' } });
  fireEvent.click(within(dialogo).getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(svc.criar).toHaveBeenCalledWith('ce-saladas', expect.objectContaining({
    titulo: 'Feriado', texto: 'Fechados dia 12/10.', inicio: null,
  })));
  expect(svc.criar.mock.calls[0][1].fim).toMatch(/^2026-10-13T/);
});

it('erro do servidor aparece no formulário', async () => {
  svc.listar.mockResolvedValue([]);
  svc.criar.mockRejectedValue({ response: { data: { error: 'O fim precisa ser depois do começo.' } } });
  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /novo informativo/i }));
  const dialogo = await screen.findByRole('dialog');
  fireEvent.change(within(dialogo).getByLabelText(/título/i), { target: { value: 'X' } });
  fireEvent.click(within(dialogo).getByRole('button', { name: /salvar/i }));
  expect(await within(dialogo).findByRole('alert')).toHaveTextContent('O fim precisa ser depois do começo.');
});

it('pausar manda ativo=false', async () => {
  svc.listar.mockResolvedValue([FERIADO]);
  svc.editar.mockResolvedValue({ ...FERIADO, ativo: false, estado: 'pausado' });
  renderizar();
  fireEvent.click((await screen.findAllByRole('switch', { name: /feriado/i }))[0]);
  await waitFor(() => expect(svc.editar).toHaveBeenCalledWith('ce-saladas', 'i1', { ativo: false }));
});
