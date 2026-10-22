/**
 * Assistente "Instalar impressora": o lojista baixa, gera a chave, instala e
 * vê o computador conectar — sem sair da tela.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const listarAgentes = jest.fn();
const criarAgente = jest.fn();
const girarChave = jest.fn();
const imprimirTeste = jest.fn();
const copiar = jest.fn();

jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: (...a: unknown[]) => listarAgentes(...a),
  listPrintJobs: jest.fn().mockResolvedValue({ data: [] }),
  createPrintAgent: (...a: unknown[]) => criarAgente(...a),
  rotatePrintAgentKey: (...a: unknown[]) => girarChave(...a),
  imprimirTesteDaComanda: (...a: unknown[]) => imprimirTeste(...a),
  updatePrintAgent: jest.fn(),
  deletePrintAgent: jest.fn(),
  requeuePrintJob: jest.fn(),
}));
jest.mock('../../../utils/clipboard', () => ({ copyToClipboard: (...a: unknown[]) => copiar(...a) }));
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn().mockResolvedValue({ id: 's1', metadata: {} }),
  updateStore: jest.fn(),
}));
jest.mock('../../../hooks/useStore', () => ({
  useStore: () => ({ store: { id: 's1', slug: 'loja-x', metadata: {} } }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import PrintSettingsPage from '../PrintSettingsPage';
import { URL_DO_INSTALADOR } from '../../../components/printing/instalador';

const SEM_CONEXAO = { id: 'a9', name: 'Caixa', slug: 'caixa', station: 'kitchen', platform: 'windows', host_name: '', printer_name: '', is_online: false, is_active: true, last_error: '', last_seen_at: null, app_version: '' };
const CONECTADO = { ...SEM_CONEXAO, is_online: true, host_name: 'PC', last_seen_at: new Date().toISOString() };

const abrirPagina = async () => {
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/printing']}>
      <Routes>
        <Route path="/stores/:storeId/printing" element={<PrintSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => { await Promise.resolve(); });
};
const abrirAssistente = async () => {
  await abrirPagina();
  fireEvent.click(screen.getAllByRole('button', { name: /instalar impressora/i })[0]);
};
const avancar = () => fireEvent.click(screen.getByRole('button', { name: /avançar/i }));
const gerarChave = async () => {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gerar chave/i })); });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  listarAgentes.mockResolvedValue({ data: [] });
  criarAgente.mockResolvedValue({ data: { ...SEM_CONEXAO, api_key: 'CHAVE-SECRETA-123' } });
  girarChave.mockResolvedValue({ data: { api_key: 'CHAVE-NOVA-456' } });
  imprimirTeste.mockResolvedValue({ data: {} });
  copiar.mockResolvedValue(true);
});
afterEach(() => { jest.useRealTimers(); });

describe('Assistente de instalação da impressora', () => {
  it('abre pelo botão "Instalar impressora"', async () => {
    await abrirPagina();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /instalar impressora/i })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /baixar instalador/i })).toBeInTheDocument();
  });

  it('etapa 1 tem o link do .exe', async () => {
    await abrirAssistente();
    const link = screen.getByRole('link', { name: /baixar instalador/i });
    expect(link).toHaveAttribute('href', URL_DO_INSTALADOR);
    expect(URL_DO_INSTALADOR).toBe('https://backend.pastita.com.br/media/downloads/pastita-print-agent-0.6.0-instalador.exe');
  });

  it('"Gerar chave" cria o computador e mostra a chave; Copiar usa a área de transferência', async () => {
    await abrirAssistente();
    avancar();
    await gerarChave();
    expect(criarAgente).toHaveBeenCalledWith('loja-x', expect.objectContaining({ store: 's1', name: 'Caixa' }));
    expect(screen.getByText('CHAVE-SECRETA-123')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /copiar/i })); });
    expect(copiar).toHaveBeenCalledWith('CHAVE-SECRETA-123');
  });

  it('reinstalar: escolhe o computador e gera nova chave', async () => {
    listarAgentes.mockResolvedValue({ data: [SEM_CONEXAO] });
    await abrirAssistente();
    await act(async () => { await Promise.resolve(); });
    avancar();
    fireEvent.click(screen.getByRole('button', { name: /já tenho/i }));
    expect(screen.getByText(/computador antigo para de imprimir/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Computador'), { target: { value: 'a9' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gerar nova chave/i })); });
    expect(girarChave).toHaveBeenCalledWith('loja-x', 'a9');
    expect(screen.getByText('CHAVE-NOVA-456')).toBeInTheDocument();
  });

  it('etapa 4 espera, vira "Conectado" e o teste chama o serviço', async () => {
    await abrirAssistente();
    avancar();
    await gerarChave();
    avancar(); // 3
    avancar(); // 4
    listarAgentes.mockResolvedValue({ data: [SEM_CONEXAO] });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/aguardando o computador/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /imprimir teste/i })).toBeNull();

    listarAgentes.mockResolvedValue({ data: [CONECTADO] });
    await act(async () => { jest.advanceTimersByTime(3000); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Conectado')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /imprimir teste/i })); });
    expect(imprimirTeste).toHaveBeenCalledWith('loja-x');
    expect(screen.getByRole('button', { name: /concluir/i })).toBeInTheDocument();
  });

  it('para de consultar ao fechar', async () => {
    await abrirAssistente();
    avancar();
    await gerarChave();
    avancar();
    avancar();
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /fechar|cancelar/i }));
    listarAgentes.mockClear();
    await act(async () => { jest.advanceTimersByTime(9000); });
    // a página consulta a cada 30 s; nada do assistente em 9 s
    expect(listarAgentes).not.toHaveBeenCalled();
  });
});
