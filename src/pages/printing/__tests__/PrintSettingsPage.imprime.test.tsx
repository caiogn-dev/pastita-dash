/**
 * Cada agente diz o que imprime: comanda, recibo, etiquetas. O lojista marca
 * na própria linha do agente — o pc da produção fica só com etiquetas.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const listarAgentes = jest.fn();
const atualizar = jest.fn().mockResolvedValue({ data: {} });
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: (...a: unknown[]) => listarAgentes(...a),
  listPrintJobs: jest.fn().mockResolvedValue({ data: [] }),
  createPrintAgent: jest.fn(),
  updatePrintAgent: (...a: unknown[]) => atualizar(...a),
  rotatePrintAgentKey: jest.fn(),
  deletePrintAgent: jest.fn(),
  requeuePrintJob: jest.fn(),
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

const AGENTE = {
  id: 'a1', name: 'pc desktop', slug: 'pc-desktop', station: 'kitchen', platform: 'windows',
  host_name: 'DESKTOP', printer_name: 'ZDesigner ZD220', available_printers: [], is_online: true,
  is_active: true, last_error: '', last_seen_at: null, app_version: '0.4.0',
  imprime: ['comanda', 'recibo'],
};

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/printing']}>
      <Routes>
        <Route path="/stores/:storeId/printing" element={<PrintSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PrintSettingsPage — o que o agente imprime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listarAgentes.mockResolvedValue({ data: [AGENTE] });
  });

  it('mostra os três papéis com o estado atual do agente', async () => {
    abrir();
    const comanda = await screen.findAllByLabelText('pc desktop imprime comanda').then((l) => l[0]);
    expect(comanda).toBeChecked();
    expect(screen.getAllByLabelText('pc desktop imprime recibo')[0]).toBeChecked();
    expect(screen.getAllByLabelText('pc desktop imprime etiquetas')[0]).not.toBeChecked();
  });

  it('marcar etiquetas grava a lista nova no agente', async () => {
    abrir();
    await userEvent.click((await screen.findAllByLabelText('pc desktop imprime etiquetas'))[0]);
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith('loja-x', 'a1', { imprime: ['comanda', 'recibo', 'etiquetas'] }));
  });

  it('desmarcar comanda tira só a comanda da lista', async () => {
    listarAgentes.mockResolvedValue({ data: [{ ...AGENTE, imprime: ['comanda', 'recibo', 'etiquetas'] }] });
    abrir();
    await userEvent.click((await screen.findAllByLabelText('pc desktop imprime comanda'))[0]);
    await waitFor(() => expect(atualizar).toHaveBeenCalledWith('loja-x', 'a1', { imprime: ['recibo', 'etiquetas'] }));
  });

  it('backend antigo sem o campo: assume comanda e recibo', async () => {
    listarAgentes.mockResolvedValue({ data: [{ ...AGENTE, imprime: undefined }] });
    abrir();
    expect(await screen.findAllByLabelText('pc desktop imprime comanda').then((l) => l[0])).toBeChecked();
    expect(screen.getAllByLabelText('pc desktop imprime etiquetas')[0]).not.toBeChecked();
  });
});
