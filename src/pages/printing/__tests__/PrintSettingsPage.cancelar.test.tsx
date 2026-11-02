/**
 * Cancelar impressão pelo painel (28/10): cancelada no Windows, a comanda
 * voltava em loop. O painel cancela uma impressão ou limpa a fila da loja.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const listarJobs = jest.fn();
const cancelar = jest.fn();
const limparFila = jest.fn();
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: jest.fn().mockResolvedValue({ data: [] }),
  listPrintJobs: (...a: unknown[]) => listarJobs(...a),
  createPrintAgent: jest.fn(),
  updatePrintAgent: jest.fn(),
  rotatePrintAgentKey: jest.fn(),
  deletePrintAgent: jest.fn(),
  requeuePrintJob: jest.fn(),
  cancelPrintJob: (...a: unknown[]) => cancelar(...a),
  cancelarFilaDeImpressao: (...a: unknown[]) => limparFila(...a),
}));
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn().mockResolvedValue({ id: 's1', metadata: {} }),
  updateStore: jest.fn(),
}));
jest.mock('../../../hooks/useStore', () => ({
  useStore: () => ({ store: { id: 's1', slug: 'loja-x', metadata: {} } }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import PrintSettingsPage from '../PrintSettingsPage';

const job = (id: string, status: string) => ({
  id, status, order_number: `P-${id}`, title: '', template: 'kitchen_ticket',
  last_error: '', created_at: '2026-10-28T12:00:00Z', printed_at: null,
});

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/printing']}>
      <Routes>
        <Route path="/stores/:storeId/printing" element={<PrintSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  listarJobs.mockReset().mockResolvedValue({ data: [job('1', 'pending'), job('2', 'claimed'), job('3', 'completed')] });
  cancelar.mockReset().mockResolvedValue({ data: {} });
  limparFila.mockReset().mockResolvedValue({ data: { canceladas: 2 } });
});

it('cancela uma impressão que ainda não saiu', async () => {
  abrir();
  const botoes = await screen.findAllByRole('button', { name: 'Cancelar impressão P-1' });
  fireEvent.click(botoes[0]);
  await waitFor(() => expect(cancelar).toHaveBeenCalledWith('1'));
  // O que já imprimiu não tem como cancelar.
  expect(screen.queryByRole('button', { name: 'Cancelar impressão P-3' })).toBeNull();
});

it('limpa a fila com confirmação, contando o que vai cancelar', async () => {
  abrir();
  const limpar = await screen.findByRole('button', { name: 'Cancelar fila (2)' });
  fireEvent.click(limpar);
  expect(limparFila).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar: cancelar 2' }));
  await waitFor(() => expect(limparFila).toHaveBeenCalledWith('loja-x'));
});
