import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const getLayout = jest.fn();
const salvar = jest.fn();
const previa = jest.fn();
const teste = jest.fn();
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock('../../../services/printing', () => ({
  getLayoutDaComanda: (...a: unknown[]) => getLayout(...a),
  salvarLayoutDaComanda: (...a: unknown[]) => salvar(...a),
  previaDaComanda: (...a: unknown[]) => previa(...a),
  imprimirTesteDaComanda: (...a: unknown[]) => teste(...a),
}));
jest.mock('../../../hooks/useStore', () => ({ useStore: () => ({ store: { id: 's1', slug: 'loja-x' } }) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import toast from 'react-hot-toast';
import LayoutDaComanda from '../LayoutDaComanda';

const LAYOUT = {
  versao: 1,
  blocos: [
    { id: 'cabecalho', ligado: true },
    { id: 'pagamento', ligado: true },
    { id: 'itens', ligado: true },
    { id: 'mensagem', ligado: false },
  ],
  separador: 'tracejado', colunas: 48, vias: 1, itens_grandes: false, precos_nos_itens: true, mensagem: '',
};
const PREVIA = {
  colunas: 48,
  linhas: [
    { texto: 'COBRAR R$ 73,44', alinhar: 'centro', negrito: true, invertido: true, tipo: 'texto' },
    { texto: '------', tipo: 'separador' },
    { texto: '123456', tipo: 'codigo_barras' },
  ],
};

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-x/printing/comanda']}>
      <Routes><Route path="/stores/:storeId/printing/comanda" element={<LayoutDaComanda />} /></Routes>
    </MemoryRouter>,
  );

describe('LayoutDaComanda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLayout.mockResolvedValue({ data: LAYOUT });
    previa.mockResolvedValue({ data: PREVIA });
    salvar.mockResolvedValue({ data: LAYOUT });
    teste.mockResolvedValue({ data: {} });
  });

  it('renderiza os blocos do layout com nomes em português', async () => {
    abrir();
    expect(await screen.findByRole('switch', { name: 'Cabeçalho da loja' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Pagamento' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Mensagem da loja' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Mensagem da loja' })).toBeDisabled();
  });

  it('desligar um bloco chama a prévia com ligado=false', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('switch', { name: 'Pagamento' }));
    await waitFor(() => {
      const ultimo = previa.mock.calls[previa.mock.calls.length - 1][1];
      expect(ultimo.blocos.find((b: { id: string }) => b.id === 'pagamento').ligado).toBe(false);
    }, { timeout: 2000 });
  });

  it('subir e descer reordenam os blocos na prévia', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Subir Itens' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descer Cabeçalho da loja' }));
    await waitFor(() => {
      const ids = previa.mock.calls[previa.mock.calls.length - 1][1].blocos.map((b: { id: string }) => b.id);
      expect(ids).toEqual(['itens', 'cabecalho', 'pagamento', 'mensagem']);
    }, { timeout: 2000 });
  });

  it('desenha linha invertida e código de barras na prévia', async () => {
    abrir();
    const linha = await screen.findByText('COBRAR R$ 73,44', {}, { timeout: 2000 });
    expect(linha).toHaveAttribute('data-invertido', 'true');
    expect(linha.className).toMatch(/bg-black/);
    expect(screen.getByTestId('previa-barras')).toBeInTheDocument();
  });

  it('Salvar faz PUT com o layout em edição', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('switch', { name: 'Itens grandes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('loja-x', expect.objectContaining({ itens_grandes: true })));
    expect(toast.success).toHaveBeenCalled();
  });

  it('Imprimir teste envia o layout e avisa', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir teste/ }));
    await waitFor(() => expect(teste).toHaveBeenCalledWith('loja-x', expect.objectContaining({ separador: 'tracejado' })));
    expect(toast.success).toHaveBeenCalled();
  });

  it('mostra falha com botão de tentar de novo', async () => {
    getLayout.mockRejectedValueOnce(new Error('x'));
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: /Tentar novamente/ }));
    expect(await screen.findByRole('switch', { name: 'Pagamento' })).toBeInTheDocument();
  });
});
