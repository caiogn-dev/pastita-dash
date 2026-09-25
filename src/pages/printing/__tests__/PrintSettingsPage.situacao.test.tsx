/**
 * A tela de Impressão diz a situação de cada agente com as palavras do
 * lojista, e pede para atualizar o programa quando ele ficou para trás.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const listarAgentes = jest.fn();
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: (...a: unknown[]) => listarAgentes(...a),
  listPrintJobs: jest.fn().mockResolvedValue({ data: [] }),
  createPrintAgent: jest.fn(),
  updatePrintAgent: jest.fn(),
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
  id: 'a1',
  name: 'Caixa',
  slug: 'caixa',
  station: 'kitchen',
  platform: 'windows',
  host_name: 'DESKTOP',
  printer_name: 'EPSON',
  available_printers: [],
  is_online: true,
  is_active: true,
  last_error: '',
  last_seen_at: null,
  app_version: '0.1.0',
  situacao: 'impressora_indisponivel',
  situacao_desde: '2026-09-24T22:00:00Z',
  situacao_detalhe: 'EPSON TM-T20 não responde — 10 impressões presas no Windows',
  versao_desatualizada: true,
  versao_atual: '0.3.0',
};

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/printing']}>
      <Routes>
        <Route path="/stores/:storeId/printing" element={<PrintSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PrintSettingsPage — situação do agente', () => {
  it('mostra a situação e o detalhe do que parou', async () => {
    listarAgentes.mockResolvedValue({ data: [AGENTE] });
    abrir();
    // A `Tabela` desenha a linha duas vezes (tabela no desktop, cartão no celular).
    expect((await screen.findAllByText('Impressora não responde'))[0]).toBeInTheDocument();
    expect(screen.getAllByText(/10 impressões presas no Windows/)[0]).toBeInTheDocument();
  });

  it('programa desatualizado ganha o selo com as duas versões', async () => {
    listarAgentes.mockResolvedValue({ data: [AGENTE] });
    abrir();
    expect((await screen.findAllByText('Atualize o programa de impressão (0.1.0 → 0.3.0)'))[0]).toBeInTheDocument();
  });

  it('em dia e imprimindo: sem selo, situação tranquila', async () => {
    listarAgentes.mockResolvedValue({
      data: [{ ...AGENTE, situacao: 'ok', situacao_detalhe: '', versao_desatualizada: false, app_version: '0.3.0' }],
    });
    abrir();
    expect((await screen.findAllByText('Imprimindo'))[0]).toBeInTheDocument();
    expect(screen.queryByText(/atualize o programa/i)).not.toBeInTheDocument();
  });

  it('tem o campo do telefone para avisos', async () => {
    listarAgentes.mockResolvedValue({ data: [] });
    abrir();
    expect(await screen.findByLabelText(/telefone para avisos de impressora/i)).toBeInTheDocument();
  });
});
