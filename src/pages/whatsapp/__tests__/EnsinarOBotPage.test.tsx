/**
 * "Ensinar o bot": três abas — onde a IA falhou, o que a loja sabe (fatos no
 * metadata) e as respostas ensinadas (conhecimento da IA, via API).
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
const toast = jest.requireMock('react-hot-toast').default as jest.Mock & { success: jest.Mock; error: jest.Mock };

const listarNaoEntendi = jest.fn();
const ensinar = jest.fn();
const conhecimento = { listar: jest.fn(), criar: jest.fn(), editar: jest.fn(), apagar: jest.fn() };
jest.mock('../../../services/atendimentoBot', () => ({
  __esModule: true,
  atendimentoBotService: {
    listarNaoEntendi: (...a: unknown[]) => listarNaoEntendi(...a),
    ensinar: (...a: unknown[]) => ensinar(...a),
  },
  conhecimentoService: {
    listar: (...a: unknown[]) => conhecimento.listar(...a),
    criar: (...a: unknown[]) => conhecimento.criar(...a),
    editar: (...a: unknown[]) => conhecimento.editar(...a),
    apagar: (...a: unknown[]) => conhecimento.apagar(...a),
  },
}));
const salvarLoja = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getProducts: jest.fn().mockResolvedValue({
    results: [{ id: 'p1', name: 'Salada Caesar' }, { id: 'p2', name: 'Brownie' }],
  }),
  updateStore: (...a: unknown[]) => salvarLoja(...a),
}));
let mockLoja: { id: string; slug: string; metadata: Record<string, unknown> } = {
  id: 'uuid-1', slug: 'loja-1', metadata: { google_review_url: 'https://g.page/x' },
};
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: mockLoja.id, storeSlug: mockLoja.slug, store: mockLoja }),
}));

import { EnsinarOBotPage } from '../EnsinarOBotPage';
import { useRootStore } from '../../../stores/rootStore';

const ITENS = [
  { id: 'm1', conversa_id: 'c1', telefone: '5563999990000', texto: 'tem caesar?', quando: '2026-09-25T15:00:00Z', resposta_do_bot: 'Desculpe, não entendi.', vezes: 4 },
  { id: 'm2', conversa_id: 'c2', telefone: '5563988887777', texto: 'vcs abrem feriado', quando: '2026-09-24T12:00:00Z', resposta_do_bot: 'Não entendi.', vezes: 1 },
];

const renderizar = (aba?: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[aba ? `/atendimento/ensinar-o-bot?aba=${aba}` : '/atendimento/ensinar-o-bot']}>
      <EnsinarOBotPage />
    </MemoryRouter>
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
  conhecimento.listar.mockResolvedValue([]);
  mockLoja = { id: 'uuid-1', slug: 'loja-1', metadata: { google_review_url: 'https://g.page/x' } };
  act(() => useRootStore.getState().setStores([mockLoja as never]));
  salvarLoja.mockImplementation(async (_id: string, dados: { metadata: Record<string, unknown> }) => ({
    ...mockLoja, metadata: dados.metadata,
  }));
});

describe('EnsinarOBotPage — aba Não entendeu', () => {
  it('abre na aba "Não entendeu" com as outras duas ao lado', async () => {
    renderizar();
    await linha('tem caesar?');
    expect(screen.getByRole('tab', { name: /não entendeu/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /o que a loja sabe/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /respostas ensinadas/i })).toBeInTheDocument();
  });

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

    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({ texto: 'tem caesar?', acao: 'produto', produto_id: 'p1' }, 'loja-1'));
    await waitFor(() => expect(screen.queryAllByText('tem caesar?')).toHaveLength(0));
    expect(toast.success).toHaveBeenCalled();
    expect(screen.getByText(/1 mensagem sem resposta nos últimos 7 dias/i)).toBeInTheDocument();
  });

  it('"Ensinar a resposta" ensina o texto digitado', async () => {
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /ensinar a resposta/i }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/resposta/i), { target: { value: 'Abrimos sim, das 11h às 15h.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /ensinar o bot/i }));
    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({
      texto: 'vcs abrem feriado', acao: 'resposta', resposta: 'Abrimos sim, das 11h às 15h.',
    }, 'loja-1'));
    await waitFor(() => expect(screen.queryAllByText('vcs abrem feriado')).toHaveLength(0));
  });

  it('"Virar regra da loja" manda tema e o fato', async () => {
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /virar regra da loja/i }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/tema/i), { target: { value: 'horarios' } });
    fireEvent.change(within(dialogo).getByLabelText(/regra/i), { target: { value: 'Em feriado abrimos das 11h às 15h.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /ensinar o bot/i }));
    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({
      texto: 'vcs abrem feriado', acao: 'regra', tema: 'horarios', resposta: 'Em feriado abrimos das 11h às 15h.',
    }, 'loja-1'));
    await waitFor(() => expect(screen.queryAllByText('vcs abrem feriado')).toHaveLength(0));
  });

  it('"Mostrar tudo" busca de novo sem o filtro de falha', async () => {
    renderizar();
    await linha('tem caesar?');
    fireEvent.click(screen.getByRole('switch', { name: /mostrar tudo/i }));
    await waitFor(() => expect(listarNaoEntendi).toHaveBeenLastCalledWith({ store: 'loja-1', dias: 7, todas: true }));
  });

  it('"Ignorar" tira da lista sem perguntar nada', async () => {
    renderizar();
    const tr = await linha('vcs abrem feriado');
    fireEvent.click(within(tr).getByRole('button', { name: /ignorar/i }));
    await waitFor(() => expect(ensinar).toHaveBeenCalledWith({ texto: 'vcs abrem feriado', acao: 'ignorar' }, 'loja-1'));
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

describe('EnsinarOBotPage — aba O que a loja sabe', () => {
  const salvouCom = () => salvarLoja.mock.calls.at(-1)[1].metadata;

  it('novo fato grava no metadata sem apagar o resto', async () => {
    renderizar('fatos');
    expect(await screen.findByText(/ainda não tem fatos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /novo fato/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/tema/i), { target: { value: 'entrega' } });
    fireEvent.change(within(dialogo).getByLabelText(/fato/i), { target: { value: 'Entregamos em Taquaralto até as 14h.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar fato/i }));

    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    expect(salvarLoja.mock.calls[0][0]).toBe('uuid-1');
    const meta = salvouCom();
    expect(meta.google_review_url).toBe('https://g.page/x');
    expect(meta.bot_fatos).toEqual([{ tema: 'entrega', texto: 'Entregamos em Taquaralto até as 14h.', ativo: true }]);
    expect(await screen.findAllByText('Entregamos em Taquaralto até as 14h.')).not.toHaveLength(0);
  });

  it('fato repetido é recusado com motivo e nada é salvo', async () => {
    mockLoja.metadata.bot_fatos = [{ tema: 'entrega', texto: 'Entregamos em Taquaralto.', ativo: true }];
    renderizar('fatos');
    fireEvent.click(await screen.findByRole('button', { name: /novo fato/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/fato/i), { target: { value: 'entregamos em taquaralto.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar fato/i }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/já está/i);
    expect(salvarLoja).not.toHaveBeenCalled();
  });

  it('desligar um fato mantém o texto e grava ativo=false', async () => {
    mockLoja.metadata.bot_fatos = [{ tema: 'produtos', texto: 'Dura 2 dias.', ativo: true }];
    renderizar('fatos');
    // A Tabela desenha cartão (celular) e linha (desktop): o mesmo switch aparece duas vezes.
    fireEvent.click((await screen.findAllByRole('switch', { name: /usar o fato: dura 2 dias/i }))[0]);
    await waitFor(() => expect(salvarLoja).toHaveBeenCalled());
    expect(salvouCom().bot_fatos).toEqual([{ tema: 'produtos', texto: 'Dura 2 dias.', ativo: false }]);
  });
});

describe('EnsinarOBotPage — aba Respostas ensinadas', () => {
  it('lista o que foi ensinado e remove', async () => {
    conhecimento.listar.mockResolvedValue([
      { id: 'k1', topic: 'outro', example_input: 'aceita vr?', example_response: 'Aceitamos VR e VA.', is_active: true },
    ]);
    conhecimento.apagar.mockResolvedValue(undefined);
    renderizar('respostas');
    expect((await screen.findAllByText('aceita vr?')).length).toBeGreaterThan(0);
    expect(conhecimento.listar).toHaveBeenCalledWith('loja-1');

    fireEvent.click(screen.getAllByRole('button', { name: /ações da resposta: aceita vr\?/i })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /remover/i }));
    await waitFor(() => expect(conhecimento.apagar).toHaveBeenCalledWith('loja-1', 'k1'));
    await waitFor(() => expect(screen.queryAllByText('aceita vr?')).toHaveLength(0));
  });

  it('nova resposta cria pela API e aparece na lista', async () => {
    conhecimento.criar.mockResolvedValue({
      id: 'k2', topic: 'outro', example_input: 'tem estacionamento?', example_response: 'Tem, na frente.', is_active: true,
    });
    renderizar('respostas');
    fireEvent.click(await screen.findByRole('button', { name: /nova resposta/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/quando perguntarem/i), { target: { value: 'tem estacionamento?' } });
    fireEvent.change(within(dialogo).getByLabelText(/a ia responde/i), { target: { value: 'Tem, na frente.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));
    await waitFor(() => expect(conhecimento.criar).toHaveBeenCalledWith('loja-1', {
      example_input: 'tem estacionamento?', example_response: 'Tem, na frente.',
    }));
    expect((await screen.findAllByText('tem estacionamento?')).length).toBeGreaterThan(0);
  });

  it('loja sem IA: o erro do backend aparece no formulário', async () => {
    conhecimento.criar.mockRejectedValue({ response: { data: { error: 'A loja não tem atendente de IA ativo.' } } });
    renderizar('respostas');
    fireEvent.click(await screen.findByRole('button', { name: /nova resposta/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/quando perguntarem/i), { target: { value: 'x' } });
    fireEvent.change(within(dialogo).getByLabelText(/a ia responde/i), { target: { value: 'y' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar resposta/i }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/atendente de IA/i);
  });
});
