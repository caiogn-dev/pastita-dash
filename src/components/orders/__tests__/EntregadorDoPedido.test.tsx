import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const entregadores = jest.fn();
const atribuir = jest.fn();
const mensagem = jest.fn();
const enviar = jest.fn();
const copiar = jest.fn();
jest.mock('../../../utils/clipboard', () => ({ copyToClipboard: (...a: unknown[]) => copiar(...a) }));
jest.mock('../../../services/operacao', () => ({
  __esModule: true,
  operacaoService: {
    entregadores: (...a: unknown[]) => entregadores(...a),
    atribuir: (...a: unknown[]) => atribuir(...a),
    mensagem: (...a: unknown[]) => mensagem(...a),
    enviar: (...a: unknown[]) => enviar(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { EntregadorDoPedido } from '../EntregadorDoPedido';

beforeEach(() => {
  entregadores.mockReset().mockResolvedValue([
    { id: 'e1', nome: 'João', telefone: '', is_active: true },
    { id: 'e2', nome: 'Pedro', telefone: '', is_active: false },
  ]);
  atribuir.mockReset().mockResolvedValue({});
});

it('atribui o entregador e esconde quem foi desligado', async () => {
  render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" />);
  const select = await screen.findByLabelText('Entregador');
  expect(screen.queryByRole('option', { name: 'Pedro' })).toBeNull();
  fireEvent.change(select, { target: { value: 'e1' } });
  await waitFor(() => expect(atribuir).toHaveBeenCalledWith('loja', 'p1', 'e1'));
});

it('loja sem entregador não mostra nada', async () => {
  entregadores.mockResolvedValue([]);
  const { container } = render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" />);
  await waitFor(() => expect(entregadores).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

describe('mensagem para o entregador', () => {
  beforeEach(() => {
    mensagem.mockReset().mockResolvedValue({ texto: 'ALINE - +55 (11) 97537-3744', whatsapp: 'https://wa.me/5563999990000?text=ALINE' });
    copiar.mockReset().mockResolvedValue(true);
    enviar.mockReset().mockResolvedValue({ enviado: true, para: 'João' });
  });

  it('envia pelo WhatsApp da loja, sem abrir nada', async () => {
    const abrir = jest.spyOn(window, 'open');
    render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" atual="e1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Enviar ao entregador/ }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('loja', 'p1'));
    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('janela fechada: mostra o motivo do servidor', async () => {
    const toast = jest.requireMock('react-hot-toast').default;
    enviar.mockRejectedValue('João não mandou mensagem para a loja nas últimas 24 h');
    render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" atual="e1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Enviar ao entregador/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('24 h')));
  });

  it('sem entregador escolhido, enviar fica desligado', async () => {
    render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" />);
    expect(await screen.findByRole('button', { name: /Enviar ao entregador/ })).toBeDisabled();
  });

  it('copia a mensagem', async () => {
    render(<EntregadorDoPedido storeSlug="loja" pedidoId="p1" atual="e1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Copiar mensagem/ }));
    await waitFor(() => expect(copiar).toHaveBeenCalledWith('ALINE - +55 (11) 97537-3744'));
  });
});
