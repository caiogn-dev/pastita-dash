/**
 * Entregador do iFood (iFood Entrega) num pedido de entrega do site/WhatsApp.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const estado = jest.fn();
const chamar = jest.fn();
const cancelar = jest.fn();
const motivosDeCancelamento = jest.fn();
const responderEndereco = jest.fn();
jest.mock('../../../services/entregaIfood', () => ({
  __esModule: true,
  entregaIfoodService: {
    estado: (...a: unknown[]) => estado(...a),
    chamar: (...a: unknown[]) => chamar(...a),
    cancelar: (...a: unknown[]) => cancelar(...a),
    motivosDeCancelamento: (...a: unknown[]) => motivosDeCancelamento(...a),
    responderEndereco: (...a: unknown[]) => responderEndereco(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { EntregadorIfood } from '../EntregadorIfood';

const entrega = (over: Record<string, unknown> = {}) => ({
  disponivel: true,
  chamado: false,
  pode_chamar: true,
  status: '',
  status_texto: '',
  ativo: false,
  rastreio_url: '',
  codigo_entrega: '',
  codigo_coleta: '',
  entregador: null,
  valor: null,
  erro: '',
  mudanca_endereco: null,
  ...over,
});

const emAndamento = entrega({
  chamado: true,
  pode_chamar: false,
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
  motivosDeCancelamento.mockReset().mockResolvedValue([
    { codigo: '809', descricao: 'Pedido cancelado pelo cliente' },
    { codigo: '810', descricao: 'Loja errou o endereço' },
  ]);
  responderEndereco.mockReset();
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
  chamar.mockResolvedValue(entrega({ chamado: true, pode_chamar: false, ativo: true, status: 'REQUESTED', status_texto: 'Procurando entregador' }));
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

describe('cancelar entregador com motivo do iFood', () => {
  it('busca os motivos, deixa escolher e envia o código', async () => {
    estado.mockResolvedValue(emAndamento);
    cancelar.mockResolvedValue({ ...emAndamento, ativo: false, pode_chamar: true, status: 'CANCELLED', status_texto: 'Cancelada' });
    render(<EntregadorIfood pedidoId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entregador' }));
    const dialogo = await screen.findByRole('dialog');
    expect(motivosDeCancelamento).toHaveBeenCalledWith('p1');
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' });
    expect(confirmar).toBeDisabled();
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Loja errou o endereço' }));
    fireEvent.click(confirmar);
    expect(await screen.findByText('Cancelada')).toBeInTheDocument();
    expect(cancelar).toHaveBeenCalledWith('p1', '810');
    expect(screen.getByRole('button', { name: 'Chamar de novo' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('lista vazia: avisa que não dá mais para cancelar', async () => {
    estado.mockResolvedValue(emAndamento);
    motivosDeCancelamento.mockResolvedValue([]);
    render(<EntregadorIfood pedidoId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entregador' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('O iFood não permite mais cancelar esta entrega'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cancelar).not.toHaveBeenCalled();
  });

  it('erro ao buscar motivos vira toast', async () => {
    estado.mockResolvedValue(emAndamento);
    motivosDeCancelamento.mockRejectedValue('iFood fora do ar');
    render(<EntregadorIfood pedidoId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entregador' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('iFood fora do ar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('erro ao cancelar vira toast e o diálogo continua', async () => {
    estado.mockResolvedValue(emAndamento);
    cancelar.mockRejectedValue('Entregador já saiu');
    render(<EntregadorIfood pedidoId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar entregador' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Pedido cancelado pelo cliente' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Entregador já saiu'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('cliente pediu outro endereço', () => {
  const AGORA = new Date('2026-11-19T15:00:00Z').getTime();
  const comMudanca = (over: Record<string, unknown> = {}) => ({
    ...emAndamento,
    mudanca_endereco: {
      status: 'PEDIDA',
      texto: 'Quadra 104 Norte, Alameda 5, 12',
      prazo: new Date(AGORA + 2 * 60_000 + 30_000).toISOString(),
      endereco: { rua: 'Alameda 5' },
      ...over,
    },
  });

  it('faixa com texto, contagem e botões', async () => {
    jest.useFakeTimers({ now: AGORA });
    estado.mockResolvedValue(comMudanca());
    render(<EntregadorIfood pedidoId="p1" />);
    const faixa = await screen.findByRole('region', { name: 'Cliente pediu outro endereço' });
    expect(within(faixa).getByText('Quadra 104 Norte, Alameda 5, 12')).toBeInTheDocument();
    expect(within(faixa).getByRole('timer').textContent).toMatch(/^2:[23]\d$/);
    expect(within(faixa).getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();
    expect(within(faixa).getByRole('button', { name: 'Recusar' })).toBeInTheDocument();
  });

  it('sem prazo não mostra contagem', async () => {
    estado.mockResolvedValue(comMudanca({ prazo: '' }));
    render(<EntregadorIfood pedidoId="p1" />);
    const faixa = await screen.findByRole('region', { name: 'Cliente pediu outro endereço' });
    expect(within(faixa).queryByRole('timer')).toBeNull();
  });

  it('sem pedido de endereço não há faixa', async () => {
    estado.mockResolvedValue(emAndamento);
    render(<EntregadorIfood pedidoId="p1" />);
    await screen.findByRole('group', { name: 'Entregador iFood' });
    expect(screen.queryByRole('region', { name: 'Cliente pediu outro endereço' })).toBeNull();
  });

  it('aceitar envia true, some a faixa e relê o pedido', async () => {
    estado.mockResolvedValue(comMudanca());
    responderEndereco.mockResolvedValue(emAndamento);
    const aoMudarPedido = jest.fn();
    render(<EntregadorIfood pedidoId="p1" aoMudarPedido={aoMudarPedido} />);
    const faixa = await screen.findByRole('region', { name: 'Cliente pediu outro endereço' });
    fireEvent.click(within(faixa).getByRole('button', { name: 'Aceitar' }));
    await waitFor(() => expect(responderEndereco).toHaveBeenCalledWith('p1', true));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Cliente pediu outro endereço' })).toBeNull());
    expect(toast().success).toHaveBeenCalled();
    expect(aoMudarPedido).toHaveBeenCalled();
  });

  it('recusar envia false e não relê o pedido', async () => {
    estado.mockResolvedValue(comMudanca());
    responderEndereco.mockResolvedValue(emAndamento);
    const aoMudarPedido = jest.fn();
    render(<EntregadorIfood pedidoId="p1" aoMudarPedido={aoMudarPedido} />);
    const faixa = await screen.findByRole('region', { name: 'Cliente pediu outro endereço' });
    fireEvent.click(within(faixa).getByRole('button', { name: 'Recusar' }));
    await waitFor(() => expect(responderEndereco).toHaveBeenCalledWith('p1', false));
    await waitFor(() => expect(toast().success).toHaveBeenCalled());
    expect(aoMudarPedido).not.toHaveBeenCalled();
  });

  it('erro ao responder vira toast e a faixa fica', async () => {
    estado.mockResolvedValue(comMudanca());
    responderEndereco.mockRejectedValue('Prazo encerrado');
    render(<EntregadorIfood pedidoId="p1" />);
    const faixa = await screen.findByRole('region', { name: 'Cliente pediu outro endereço' });
    fireEvent.click(within(faixa).getByRole('button', { name: 'Aceitar' }));
    await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Prazo encerrado'));
    expect(screen.getByRole('region', { name: 'Cliente pediu outro endereço' })).toBeInTheDocument();
  });
});

it('falhou: mostra o erro e "Chamar de novo" usa o mesmo chamar', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, pode_chamar: true, status: 'FAILED', status_texto: 'Falhou', erro: 'Nenhum entregador aceitou' }));
  chamar.mockResolvedValue(entrega({ chamado: true, pode_chamar: false, ativo: true, status: 'REQUESTED', status_texto: 'Procurando entregador' }));
  render(<EntregadorIfood pedidoId="p1" />);
  expect(await screen.findByText('Nenhum entregador aceitou')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar entregador' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Chamar de novo' }));
  expect(await screen.findByText('Procurando entregador')).toBeInTheDocument();
  expect(chamar).toHaveBeenCalledWith('p1');
});

it('entregue: sem cancelar nem chamar de novo', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, pode_chamar: false, status: 'DELIVERED', status_texto: 'Entregue' }));
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
  estado.mockResolvedValue(entrega({ chamado: true, pode_chamar: false, status: 'DELIVERED', status_texto: 'Entregue' }));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(estado).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(estado).toHaveBeenCalledTimes(2);
  unmount();
});

it('quem decide "Chamar de novo" é pode_chamar, não o texto do status', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, pode_chamar: true, status: 'XYZ', status_texto: 'Sem entregador' }));
  render(<EntregadorIfood pedidoId="p1" />);
  expect(await screen.findByRole('button', { name: 'Chamar de novo' })).toBeInTheDocument();
});

it('cancelada sem pode_chamar não oferece chamar de novo', async () => {
  estado.mockResolvedValue(entrega({ chamado: true, pode_chamar: false, status: 'CANCELLED', status_texto: 'Cancelada' }));
  render(<EntregadorIfood pedidoId="p1" />);
  await screen.findByText('Cancelada');
  expect(screen.queryByRole('button', { name: 'Chamar de novo' })).toBeNull();
});

it('sem entrega e sem pode_chamar não mostra o botão de chamar', async () => {
  estado.mockResolvedValue(entrega({ pode_chamar: false }));
  const { container } = render(<EntregadorIfood pedidoId="p1" />);
  await waitFor(() => expect(estado).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

describe('código de coleta (pickupCode)', () => {
  it('aparece antes de chamar o entregador', async () => {
    estado.mockResolvedValue(entrega({ codigo_coleta: '1234' }));
    render(<EntregadorIfood pedidoId="p1" />);
    expect(await screen.findByLabelText('Código de coleta')).toHaveTextContent('1234');
    expect(screen.getByRole('button', { name: 'Chamar entregador iFood' })).toBeInTheDocument();
  });

  it('aparece com o entregador em andamento', async () => {
    estado.mockResolvedValue({ ...emAndamento, codigo_coleta: '5678' });
    render(<EntregadorIfood pedidoId="p1" />);
    expect(await screen.findByLabelText('Código de coleta')).toHaveTextContent('5678');
  });

  it('pedido que o iFood já entrega mostra só o código', async () => {
    estado.mockResolvedValue(entrega({ pode_chamar: false, codigo_coleta: '9012' }));
    render(<EntregadorIfood pedidoId="p1" />);
    expect(await screen.findByLabelText('Código de coleta')).toHaveTextContent('9012');
    expect(screen.queryByRole('button', { name: 'Chamar entregador iFood' })).toBeNull();
  });
});
