/**
 * Entregador do iFood (iFood Entrega) num pedido de entrega do site/WhatsApp.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const estado = jest.fn();
const chamar = jest.fn();
const cancelar = jest.fn();
jest.mock('../../../services/entregaIfood', () => ({
  __esModule: true,
  entregaIfoodService: {
    estado: (...a: unknown[]) => estado(...a),
    chamar: (...a: unknown[]) => chamar(...a),
    cancelar: (...a: unknown[]) => cancelar(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { EntregadorIfood } from '../EntregadorIfood';

const entrega = (over: Record<string, unknown> = {}) => ({
  disponivel: true,
  chamado: false,
  status: '',
  status_texto: '',
  ativo: false,
  rastreio_url: '',
  codigo_entrega: '',
  entregador: null,
  valor: null,
  erro: '',
  ...over,
});

const emAndamento = entrega({
  chamado: true,
  status: 'ASSIGNED',
  status_texto: 'Entregador a caminho da loja',
  ativo: true,
  rastreio_url: 'https://meupedido.ifood.com.br/abc',
  codigo_entrega: '4821',
  entregador: { nome: 'Marcos', telefone: '+5563999990000' },
  valor: 8.9,
});

const toast = () => jest.requireMock('react-hot-toast').default;

beforeEach(() => {
  estado.mockReset();
  chamar.mockReset();
  cancelar.mockReset();
  toast().error.mockReset();
  toast().success.mockReset();
});

afterEach(() => { jest.useRealTimers(); });

it('busca o estado ao abrir', async () => {
  estado.mockResolvedValue(entrega());
  render(<EntregadorIfood pedidoId="p1" />);
  await screen.findByRole('button', { name: 'Chamar entregador iFood' });
  expect(estado).toHaveBeenCalledWith('p1');
});

it('loja sem iFood Entrega não mostra nada', async () => {
  estado.mockResolvedValue(entrega({ disponivel: false }));
  const { container } = render(<EntregadorIfood pedidoId="p1" />);
  await waitFor(() => expect(estado).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it('falha ao carregar não mostra nada (nem quebra o modal)', async () => {
  estado.mockRejectedValue(new Error('rede'));
  const { container } = render(<EntregadorIfood pedidoId="p1" />);
  await waitFor(() => expect(estado).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it('chamar mostra o status devolvido', async () => {
  estado.mockResolvedValue(entrega());
  chamar.mockResolvedValue(entrega({ chamado: true, ativo: true, status: 'REQUESTED', status_texto: 'Procurando entregador' }));
  render(<EntregadorIfood pedidoId="p1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chamar entregador iFood' }));
  expect(await screen.findByText('Procurando entregador')).toBeInTheDocument();
  expect(chamar).toHaveBeenCalledWith('p1');
  expect(screen.queryByRole('button', { name: 'Chamar entregador iFood' })).toBeNull();
});

it('erro ao chamar vira toast com o motivo', async () => {
  estado.mockResolvedValue(entrega());
  chamar.mockRejectedValue('Endereço fora da área do iFood');
  render(<EntregadorIfood pedidoId="p1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Chamar entregador iFood' }));
  await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Endereço fora da área do iFood'));
  expect(screen.getByRole('button', { name: 'Chamar entregador iFood' })).toBeEnabled();
});

it('em andamento: status, entregador, valor, código, rastreio e cancelar', async () => {
  estado.mockResolvedValue(emAndamento);
  render(<EntregadorIfood pedidoId="p1" />);
  const bloco = await screen.findByRole('group', { name: 'Entregador iFood' });
  expect(within(bloco).getByText('Entregador a caminho da loja')).toBeInTheDocument();
  expect(within(bloco).getByText('Marcos')).toBeInTheDocument();
  expect(within(bloco).getByRole('link', { name: /Ligar para Marcos/ })).toHaveAttribute('href', 'tel:+5563999990000');
  expect(within(bloco).getByText('R$ 8,90')).toBeInTheDocument();
  expect(within(bloco).getByLabelText('Código de entrega')).toHaveTextContent('4821');
  const rastrear = within(bloco).getByRole('link', { name: /Rastrear/ });
  expect(rastrear).toHaveAttribute('href', 'https://meupedido.ifood.com.br/abc');
  expect(rastrear).toHaveAttribute('target', '_blank');
  expect(rastrear).toHaveAttribute('rel', expect.stringContaining('noopener'));
  expect(within(bloco).getByRole('button', { name: 'Cancelar entregador' })).toBeInTheDocument();
  expect(within(bloco).queryByRole('button', { name: 'Chamar de novo' })).toBeNull();
});

it('cancelar pede confirmação e envia', async () => {
  estado.mockResolvedValue(emAndamento);
  cancelar.mockResolvedValue({ ...emAndamento, ativo: false, status: 'CANCELLED', status_texto: 'Cancelada' });
  render(<EntregadorIfood pedidoId="p1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entregador' }));
  expect(cancelar).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Sim, cancelar' }));
  expect(await screen.findByText('Cancelada')).toBeInTheDocument();
  expect(cancelar).toHaveBeenCalledWith('p1');
  expect(screen.getByRole('button', { name: 'Chamar de novo' })).toBeInTheDocument();
});

it('falhou: mostra o erro e "Chamar de novo" usa o mesmo chamar', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, status: 'FAILED', status_texto: 'Falhou', erro: 'Nenhum entregador aceitou' }));
  chamar.mockResolvedValue(entrega({ chamado: true, ativo: true, status: 'REQUESTED', status_texto: 'Procurando entregador' }));
  render(<EntregadorIfood pedidoId="p1" />);
  expect(await screen.findByText('Nenhum entregador aceitou')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar entregador' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Chamar de novo' }));
  expect(await screen.findByText('Procurando entregador')).toBeInTheDocument();
  expect(chamar).toHaveBeenCalledWith('p1');
});

it('entregue: sem cancelar nem chamar de novo', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, status: 'DELIVERED', status_texto: 'Entregue' }));
  render(<EntregadorIfood pedidoId="p1" />);
  await screen.findByText('Entregue');
  expect(screen.queryByRole('button', { name: 'Cancelar entregador' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Chamar de novo' })).toBeNull();
});

it('em andamento atualiza a cada 30 s; parado não', async () => {
  jest.useFakeTimers();
  estado.mockResolvedValue(emAndamento);
  const { unmount } = render(<EntregadorIfood pedidoId="p1" />);
  await act(async () => { await Promise.resolve(); });
  expect(estado).toHaveBeenCalledTimes(1);
  estado.mockResolvedValue(entrega({ chamado: true, status: 'DELIVERED', status_texto: 'Entregue' }));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(estado).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(estado).toHaveBeenCalledTimes(2);
  unmount();
});
