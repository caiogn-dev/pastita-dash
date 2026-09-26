/**
 * "O bot não entendeu": o lojista vê o que caiu em "não entendi" e ensina.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toast = jest.requireMock('react-hot-toast').default as jest.Mock & { success: jest.Mock; error: jest.Mock };

const listarNaoEntendi = jest.fn();
const ensinar = jest.fn();
jest.mock('../../../services/atendimentoBot', () => ({
  __esModule: true,
  atendimentoBotService: {
    listarNaoEntendi: (...a: unknown[]) => listarNaoEntendi(...a),
    ensinar: (...a: unknown[]) => ensinar(...a),
  },
}));
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getProducts: jest.fn().mockResolvedValue({
    results: [{ id: 'p1', name: 'Salada Caesar' }, { id: 'p2', name: 'Brownie' }],
  }),
}));
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'uuid-1', storeSlug: 'loja-1', store: { id: 'uuid-1', slug: 'loja-1' } }),
}));

import { NaoEntendiPage } from '../NaoEntendiPage';

const ITENS = [
  { id: 'm1', conversa_id: 'c1', telefone: '5563999990000', texto: 'tem caesar?', quando: '2026-09-25T15:00:00Z', resposta_do_bot: 'Desculpe, não entendi.', vezes: 4 },
  { id: 'm2', conversa_id: 'c2', telefone: '5563988887777', texto: 'vcs abrem feriado', quando: '2026-09-24T12:00:00Z', resposta_do_bot: 'Não entendi.', vezes: 1 },
];

const renderizar = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><NaoEntendiPage /></MemoryRouter>
  </QueryClientProvider>,
);

const linha = async (texto: string) => {
  // A Tabela desenha cartão (celular) e linha (desktop); a linha da tabela é a <tr>.
  const achados = await screen.findAllByText(texto);
  return achados.map((el) => el.closest('tr')).find(Boolean) as HTMLElement;
};

beforeEach(() => {
  jest.clearAllMocks();
  listarNaoEntendi.mockResolvedValue(ITENS);
  ensinar.mockResolvedValue(undefined);
});

describe('NaoEntendiPage', () => {
  it('busca os últimos 7 dias da loja e mostra o total no topo', async () => {
    renderizar();
    await linha('tem caesar?');
    expect(listarNaoEntendi).toHaveBeenCalledWith({ store: 'loja-1', dias: 7 });
    // 4 + 1 vezes = 5 mensagens.
    expect(screen.getByText(/5 mensagens sem resposta nos últimos 7 dias/i)).toBeInTheDocument();
  });

  it('mostra telefone formatado, quantas vezes e o que o bot respondeu', async () => {
    renderizar();
    const tr = await linha('tem caesar?');
    expect(within(tr).getByText('+55 (63) 99999-0000')).toBeInTheDocument();
    expect(within(tr).getByText(/4 vezes/)).toBeInTheDocument();
    expect(within(tr).getByText('Desculpe, não entendi.')).toBeInTheDocument();
  });

  it('trocar para 30 dias busca de novo', async () => {
    renderizar();
    await linha('tem caesar?');
    fireEvent.click(screen.getByRole('tab', { name: /30 dias/i }));
    await waitFor(() => expect(listarNaoEntendi).toHaveBeenLastCalledWith({ store: 'loja-1', dias: 30 }));
  });

  it('"É um produto" ensina o produto escolhido e a linha some', async () => {
    renderizar();
    const tr = await linha('tem caesar?');
    fireEvent.click(within(tr).getByRole('button', { name: /é um produto/i }));
    const dialogo = await screen.findByRole('dialog');
    const select = await within(dialogo).findByLabelText(/produto/i);
    await waitFor(() => expect(within(select as HTMLElement).getByText('Salada Caesar')).toBeInTheDocument());
    fireEvent.change(select, { target: { value: 'p1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /ensinar/i }));

    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({ texto: 'tem caesar?', acao: 'produto', produto_id: 'p1' }));
    await waitFor(() => expect(screen.queryAllByText('tem caesar?')).toHaveLength(0));
    expect(toast.success).toHaveBeenCalled();
    expect(screen.getByText(/1 mensagem sem resposta nos últimos 7 dias/i)).toBeInTheDocument();
  });

  it('"Responder assim" ensina o texto digitado', async () => {
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /responder assim/i }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/resposta/i), { target: { value: 'Abrimos sim, das 11h às 15h.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /ensinar/i }));
    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({
      texto: 'vcs abrem feriado', acao: 'resposta', resposta: 'Abrimos sim, das 11h às 15h.',
    }));
    await waitFor(() => expect(screen.queryAllByText('vcs abrem feriado')).toHaveLength(0));
  });

  it('"Ignorar" tira da lista sem perguntar nada', async () => {
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /ignorar/i }));
    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({ texto: 'vcs abrem feriado', acao: 'ignorar' }));
    await waitFor(() => expect(screen.queryAllByText('vcs abrem feriado')).toHaveLength(0));
  });

  it('falha ao ensinar mantém a linha e avisa', async () => {
    ensinar.mockRejectedValue(new Error('rede'));
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /ignorar/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getAllByText('vcs abrem feriado').length).toBeGreaterThan(0);
  });

  it('lista vazia diz que está tudo respondido — não é erro', async () => {
    listarNaoEntendi.mockResolvedValue([]);
    renderizar();
    expect(await screen.findByText(/o bot entendeu tudo/i)).toBeInTheDocument();
  });

  it('falha ao carregar NÃO vira "entendeu tudo" (vazio enganoso)', async () => {
    listarNaoEntendi.mockRejectedValue(new Error('500'));
    renderizar();
    expect(await screen.findByText(/não consegui carregar/i)).toBeInTheDocument();
    expect(screen.queryByText(/o bot entendeu tudo/i)).not.toBeInTheDocument();
  });
});
