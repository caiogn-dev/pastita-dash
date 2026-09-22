/**
 * Fila humana — o dono vê quem está esperando uma pessoa responder.
 *
 * Até 19/09 esta página lia `HandoverRequest`, tabela com ZERO linhas desde
 * sempre: nada no sistema a preenchia. A página vivia vazia enquanto 7
 * clientes esperavam resposta (e 57 tinham ficado sem resposta há dias).
 * Agora lê `/conversations/fila-humana/`, montada a partir das conversas.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HandoverRequestsPage } from '../HandoverRequestsPage';

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'ce-saladas', storeName: 'Cê Saladas', store: null }),
}));

const getFilaHumana = jest.fn();
const resolveConversation = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getFilaHumana: (...a: unknown[]) => getFilaHumana(...a),
    resolveConversation: (...a: unknown[]) => resolveConversation(...a),
  },
}));

const item = (over: Record<string, unknown>) => ({
  id: 'c1', telefone: '5563999990001', nome: 'Joana', motivo: 'Respondido pelo WhatsApp do celular',
  humano_desde: '2026-09-19T10:00:00Z', cliente_escreveu_em: '2026-09-19T14:00:00Z',
  minutos_esperando: 40, ultima_mensagem: 'Oi, meu pedido já saiu?', ...over,
});

const renderizar = () => render(
  <MemoryRouter><HandoverRequestsPage /></MemoryRouter>,
);

beforeEach(() => {
  getFilaHumana.mockReset();
  resolveConversation.mockReset();
});

it('mostra quem está esperando, com motivo, tempo e a última mensagem', async () => {
  getFilaHumana.mockResolvedValue({
    esperando: [item({})], em_atendimento: [], total_esperando: 1, total_em_atendimento: 0,
  });

  renderizar();

  expect(await screen.findByText('Joana')).toBeInTheDocument();
  expect(screen.getByText(/celular/i)).toBeInTheDocument();
  expect(screen.getByText(/40 min/)).toBeInTheDocument();
  expect(screen.getByText(/meu pedido já saiu/)).toBeInTheDocument();
});

it('pede a fila da loja selecionada', async () => {
  getFilaHumana.mockResolvedValue({ esperando: [], em_atendimento: [], total_esperando: 0, total_em_atendimento: 0 });

  renderizar();

  await waitFor(() => expect(getFilaHumana).toHaveBeenCalledWith('ce-saladas'));
});

it('separa quem ficou sem resposta há mais de um dia', async () => {
  getFilaHumana.mockResolvedValue({
    esperando: [item({ id: 'velho', nome: 'Carlos', minutos_esperando: 3 * 24 * 60 }), item({})],
    em_atendimento: [], total_esperando: 2, total_em_atendimento: 0,
  });

  renderizar();

  expect(await screen.findByText(/sem resposta há mais de 1 dia/i)).toBeInTheDocument();
  expect(screen.getByText(/3 dias/)).toBeInTheDocument();
});

it('responder leva direto para a conversa na caixa de entrada', async () => {
  getFilaHumana.mockResolvedValue({
    esperando: [item({})], em_atendimento: [], total_esperando: 1, total_em_atendimento: 0,
  });

  renderizar();

  const link = await screen.findByRole('link', { name: /responder/i });
  expect(link).toHaveAttribute('href', '/inbox/whatsapp?conversation=c1');
});

it('resolver devolve ao bot e tira da fila', async () => {
  getFilaHumana.mockResolvedValue({
    esperando: [item({})], em_atendimento: [], total_esperando: 1, total_em_atendimento: 0,
  });
  resolveConversation.mockResolvedValue({});

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /resolver/i }));

  await waitFor(() => expect(resolveConversation).toHaveBeenCalledWith('c1'));
  await waitFor(() => expect(screen.queryByText('Joana')).not.toBeInTheDocument());
});

it('fila vazia diz que ninguém está esperando', async () => {
  getFilaHumana.mockResolvedValue({ esperando: [], em_atendimento: [], total_esperando: 0, total_em_atendimento: 0 });

  renderizar();

  expect(await screen.findByText(/ninguém esperando/i)).toBeInTheDocument();
});

it('falha na consulta não vira "ninguém esperando"', async () => {
  getFilaHumana.mockRejectedValue(new Error('500'));

  renderizar();

  expect(await screen.findByText(/não foi possível carregar a fila/i)).toBeInTheDocument();
  expect(screen.queryByText(/ninguém esperando/i)).not.toBeInTheDocument();
});
