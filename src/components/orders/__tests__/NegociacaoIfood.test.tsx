/**
 * Plataforma de Negociação do iFood no modal do pedido (critério de homologação).
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const negociacao = jest.fn();
const responder = jest.fn();
jest.mock('../../../services/ifoodPedido', () => ({
  __esModule: true,
  ifoodPedidoService: {
    negociacao: (...a: unknown[]) => negociacao(...a),
    responder: (...a: unknown[]) => responder(...a),
  },
}));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { NegociacaoIfood } from '../NegociacaoIfood';

const toast = () => jest.requireMock('react-hot-toast').default;
const AGORA = new Date('2026-11-19T15:00:00Z').getTime();

const disputa = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  status: 'ABERTA',
  acao: 'CANCELLATION',
  tipo: 'AFTER_DELIVERY',
  mensagem: 'Veio frio',
  expira_em: new Date(AGORA + 4 * 60_000 + 30_000).toISOString(),
  se_nao_responder: 'ACCEPT_CANCELLATION',
  motivos_aceite: ['PRODUCT_QUALITY'],
  alternativas: [],
  evidencias: [],
  ...over,
});

const faixa = () => screen.findByRole('region', { name: 'Negociação iFood' });

beforeEach(() => {
  jest.useFakeTimers({ now: AGORA });
  negociacao.mockReset();
  responder.mockReset();
  toast().error.mockReset();
  toast().success.mockReset();
});
afterEach(() => { jest.useRealTimers(); });

it('sem disputa não mostra nada', async () => {
  negociacao.mockResolvedValue(null);
  const { container } = render(<NegociacaoIfood pedidoId="p1" />);
  await act(async () => { await Promise.resolve(); });
  expect(negociacao).toHaveBeenCalledWith('p1');
  expect(container).toBeEmptyDOMElement();
});

it('falha ao carregar não mostra nada', async () => {
  negociacao.mockRejectedValue('x');
  const { container } = render(<NegociacaoIfood pedidoId="p1" />);
  await act(async () => { await Promise.resolve(); });
  expect(container).toBeEmptyDOMElement();
});

it('aberta: pedido do cliente, mensagem, contagem e o que acontece sem resposta', async () => {
  negociacao.mockResolvedValue(disputa());
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  expect(within(f).getByText(/Cliente pediu: cancelamento do pedido/)).toBeInTheDocument();
  expect(within(f).getByText(/Veio frio/)).toBeInTheDocument();
  const timer = within(f).getByRole('timer');
  expect(timer.textContent).toMatch(/^4:[23]\d$/);
  const antes = timer.textContent;
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(timer.textContent).toMatch(/^4:[23]\d$/);
  expect(timer.textContent).not.toBe(antes);
  expect(within(f).getByText('Sem resposta: cancela')).toBeInTheDocument();
});

it('REJECT_CANCELLATION vira "Sem resposta: recusa"', async () => {
  negociacao.mockResolvedValue(disputa({ se_nao_responder: 'REJECT_CANCELLATION' }));
  render(<NegociacaoIfood pedidoId="p1" />);
  expect(within(await faixa()).getByText('Sem resposta: recusa')).toBeInTheDocument();
});

it('aceitar com um motivo só envia direto ao confirmar e avisa o pai', async () => {
  negociacao.mockResolvedValue(disputa());
  responder.mockResolvedValue(disputa({ status: 'ACCEPTED' }));
  const aoResponder = jest.fn();
  render(<NegociacaoIfood pedidoId="p1" aoResponder={aoResponder} />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Aceitar' }));
  expect(within(f).queryByLabelText('Motivo')).toBeNull();
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith('p1', { resposta: 'aceitar', motivo: 'PRODUCT_QUALITY' }));
  expect(await screen.findByText(/Aceita/)).toBeInTheDocument();
  expect(aoResponder).toHaveBeenCalled();
});

it('aceitar com vários motivos deixa escolher (rótulos pt-BR)', async () => {
  negociacao.mockResolvedValue(disputa({ motivos_aceite: ['PRODUCT_QUALITY', 'WRONG_ORDER'] }));
  responder.mockResolvedValue(disputa({ status: 'ACCEPTED' }));
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Aceitar' }));
  const motivo = within(f).getByLabelText('Motivo');
  expect(within(motivo).getByRole('option', { name: 'Pedido errado' })).toBeInTheDocument();
  fireEvent.change(motivo, { target: { value: 'WRONG_ORDER' } });
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith('p1', { resposta: 'aceitar', motivo: 'WRONG_ORDER' }));
});

it('recusar exige motivo da lista', async () => {
  negociacao.mockResolvedValue(disputa());
  responder.mockResolvedValue(disputa({ status: 'REJECTED' }));
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Recusar' }));
  expect(within(f).getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  fireEvent.change(within(f).getByLabelText('Motivo'), { target: { value: 'HIGH_STORE_DEMAND' } });
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith('p1', { resposta: 'recusar', motivo: 'HIGH_STORE_DEMAND' }));
  expect(await screen.findByText(/Recusada/)).toBeInTheDocument();
});

it('oferecer reembolso respeita o máximo e envia centavos', async () => {
  negociacao.mockResolvedValue(disputa({
    alternativas: [{ id: 'a1', type: 'REFUND', metadata: { maxAmount: { value: '2590', currency: 'BRL' } } }],
  }));
  responder.mockResolvedValue(disputa({ status: 'RESPONDIDA' }));
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Oferecer reembolso' }));
  const valor = within(f).getByLabelText('Valor (R$)');
  expect(within(f).getByText(/máx\. R\$ 25,90/)).toBeInTheDocument();
  fireEvent.change(valor, { target: { value: '30' } });
  expect(within(f).getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  fireEvent.change(valor, { target: { value: '12,50' } });
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith('p1', { resposta: 'alternativa', tipo: 'REFUND', valor_centavos: 1250 }));
});

it('BENEFIT vira "Oferecer crédito"', async () => {
  negociacao.mockResolvedValue(disputa({
    alternativas: [{ id: 'a2', type: 'BENEFIT', metadata: { maxAmount: { value: '1000', currency: 'BRL' } } }],
  }));
  render(<NegociacaoIfood pedidoId="p1" />);
  expect(within(await faixa()).getByRole('button', { name: 'Oferecer crédito' })).toBeInTheDocument();
});

it('pedir mais tempo: minutos e motivo permitidos', async () => {
  negociacao.mockResolvedValue(disputa({
    acao: 'PROPOSED_ADDITIONAL_TIME',
    alternativas: [{ id: 'a3', type: 'ADDITIONAL_TIME', metadata: {
      allowedsAdditionalTimeInMinutes: [10, 20, 30],
      allowedsAdditionalTimeReasons: ['HIGH_STORE_DEMAND', 'SYSTEM_ISSUE'],
    } }],
  }));
  responder.mockResolvedValue(disputa({ status: 'RESPONDIDA' }));
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Pedir mais tempo' }));
  fireEvent.change(within(f).getByLabelText('Minutos'), { target: { value: '20' } });
  fireEvent.change(within(f).getByLabelText('Motivo'), { target: { value: 'SYSTEM_ISSUE' } });
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(responder).toHaveBeenCalledWith('p1', {
    resposta: 'alternativa', tipo: 'ADDITIONAL_TIME', minutos: 20, motivo: 'SYSTEM_ISSUE',
  }));
});

it('erro ao responder vira toast', async () => {
  negociacao.mockResolvedValue(disputa());
  responder.mockRejectedValue('Disputa expirada');
  render(<NegociacaoIfood pedidoId="p1" />);
  const f = await faixa();
  fireEvent.click(within(f).getByRole('button', { name: 'Aceitar' }));
  fireEvent.click(within(f).getByRole('button', { name: 'Confirmar' }));
  await waitFor(() => expect(toast().error).toHaveBeenCalledWith('Disputa expirada'));
});

it.each([
  ['ACCEPTED', 'Aceita'],
  ['REJECTED', 'Recusada'],
  ['EXPIRED', 'Expirou'],
  ['ALTERNATIVE_REPLIED', 'Contraproposta aceita'],
  ['RESPONDIDA', 'Respondida'],
])('resolvida %s: linha discreta "%s", sem botões', async (status, rotulo) => {
  negociacao.mockResolvedValue(disputa({ status }));
  render(<NegociacaoIfood pedidoId="p1" />);
  expect(await screen.findByText(new RegExp(rotulo))).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aceitar' })).toBeNull();
  expect(screen.queryByRole('timer')).toBeNull();
});

it('relê a cada 30 s enquanto aberta ou respondida; para quando resolve', async () => {
  negociacao.mockResolvedValue(disputa());
  render(<NegociacaoIfood pedidoId="p1" />);
  await faixa();
  expect(negociacao).toHaveBeenCalledTimes(1);
  negociacao.mockResolvedValue(disputa({ status: 'RESPONDIDA' }));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(negociacao).toHaveBeenCalledTimes(2);
  negociacao.mockResolvedValue(disputa({ status: 'ACCEPTED' }));
  await act(async () => { jest.advanceTimersByTime(30_000); });
  expect(negociacao).toHaveBeenCalledTimes(3);
  await act(async () => { jest.advanceTimersByTime(90_000); });
  expect(negociacao).toHaveBeenCalledTimes(3);
});
