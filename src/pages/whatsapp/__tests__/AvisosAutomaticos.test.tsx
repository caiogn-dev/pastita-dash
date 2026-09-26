/**
 * Avisos automáticos — o dono vê o que a loja mandou sozinha.
 *
 * Até 19/09 não havia onde ver: a tela "Mensagens automáticas" só edita os
 * textos. E 1 em cada 4 avisos de status falhava (janela de 24 h do WhatsApp)
 * sem ninguém saber.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AvisosAutomaticosPage } from '../AvisosAutomaticosPage';

let mockLoja: { storeId: string | null; storeSlug: string | null; storeName: string | null; store: null };
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => mockLoja,
}));

const getMensagensAutomaticas = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getMensagensAutomaticas: (...a: unknown[]) => getMensagensAutomaticas(...a),
  },
}));

const item = (over: Record<string, unknown>) => ({
  id: 'm1', quando: '2026-09-19T14:00:00Z', tipo: 'status', rotulo: 'Status do pedido',
  cliente: 'Marta', telefone: '5563999991001', texto: 'Seu pedido saiu para entrega',
  status: 'delivered', erro: '', erro_tecnico: '', conversa_id: 'c1', ...over,
});

const resposta = (itens = [item({})]) => ({
  dias: 7,
  resumo: [
    { tipo: 'status', rotulo: 'Status do pedido', total: 4, falharam: 1 },
    { tipo: 'feedback_request', rotulo: 'Pedido de avaliação', total: 2, falharam: 0 },
  ],
  itens,
});

const renderizar = () => render(<MemoryRouter><AvisosAutomaticosPage /></MemoryRouter>);

beforeEach(() => {
  getMensagensAutomaticas.mockReset();
  mockLoja = { storeId: 'loja-1', storeSlug: 'ce-saladas', storeName: 'Cê Saladas', store: null };
});

/** Uma busca que só resolve quando o teste mandar — para observar o "carregando". */
const buscaPendente = () => {
  let resolver!: (v: unknown) => void;
  getMensagensAutomaticas.mockReturnValueOnce(new Promise((res) => { resolver = res; }));
  return (v: unknown) => resolver(v);
};

it('mostra cada aviso com tipo, cliente, texto e link para a conversa', async () => {
  getMensagensAutomaticas.mockResolvedValue(resposta());

  renderizar();

  const linha = (await screen.findByText('Seu pedido saiu para entrega')).closest('li')!;
  expect(within(linha).getByText('Marta')).toBeInTheDocument();
  expect(within(linha).getByText('Status do pedido')).toBeInTheDocument();
  expect(within(linha).getByText('Entregue')).toBeInTheDocument();
  expect(within(linha).getByRole('link', { name: /abrir conversa/i }))
    .toHaveAttribute('href', '/inbox/whatsapp?conversation=c1');
});

it('falha aparece com o motivo em português', async () => {
  getMensagensAutomaticas.mockResolvedValue(resposta([
    item({ status: 'failed', erro: 'Não chegou: o cliente não fala com a loja há mais de 24 h.' }),
  ]));

  renderizar();

  expect(await screen.findByText('Não chegou')).toBeInTheDocument();
  expect(screen.getByText(/há mais de 24 h/)).toBeInTheDocument();
});

it('resumo por tipo mostra total e falhas, e filtra ao clicar', async () => {
  getMensagensAutomaticas.mockResolvedValue(resposta());

  renderizar();

  const filtro = await screen.findByRole('button', { name: /Status do pedido.*4.*1 falhou/i });
  fireEvent.click(filtro);

  await waitFor(() => expect(getMensagensAutomaticas).toHaveBeenLastCalledWith(
    { store: 'ce-saladas', dias: 7, tipo: 'status' },
  ));
  expect(filtro).toHaveAttribute('aria-pressed', 'true');
});

it('pede o período escolhido', async () => {
  getMensagensAutomaticas.mockResolvedValue(resposta());

  renderizar();
  fireEvent.change(await screen.findByLabelText('Período'), { target: { value: '30' } });

  await waitFor(() => expect(getMensagensAutomaticas).toHaveBeenLastCalledWith(
    { store: 'ce-saladas', dias: 30, tipo: undefined },
  ));
});

it('erro ao carregar não vira "nada enviado"', async () => {
  getMensagensAutomaticas.mockRejectedValue(new Error('rede'));

  renderizar();

  expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
  expect(screen.queryByText(/nenhum aviso/i)).not.toBeInTheDocument();
});

it('vazio explica o que aparece aqui', async () => {
  getMensagensAutomaticas.mockResolvedValue({ dias: 7, resumo: [], itens: [] });

  renderizar();

  expect(await screen.findByText(/nenhum aviso/i)).toBeInTheDocument();
});

it('enquanto busca mostra carregando, sem fingir "nenhum aviso"', async () => {
  const responder = buscaPendente();

  renderizar();

  // Carregando é anunciado (role=status), e o vazio confiante NÃO aparece
  // antes de a busca voltar.
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByText(/nenhum aviso/i)).not.toBeInTheDocument();

  responder(resposta());
  expect(await screen.findByText('Seu pedido saiu para entrega')).toBeInTheDocument();
});

it('trocar de loja não mostra os avisos da loja anterior', async () => {
  getMensagensAutomaticas.mockResolvedValueOnce(resposta());
  const { rerender } = renderizar();
  await screen.findByText('Seu pedido saiu para entrega');

  // Nova loja selecionada; a busca da nova loja ainda não voltou.
  const responder = buscaPendente();
  mockLoja = { storeId: 'loja-2', storeSlug: 'outra-loja', storeName: 'Outra', store: null };
  rerender(<MemoryRouter><AvisosAutomaticosPage /></MemoryRouter>);

  // O aviso da loja anterior some na hora (não pode vazar entre lojas) e a tela
  // volta a carregar.
  await waitFor(() =>
    expect(screen.queryByText('Seu pedido saiu para entrega')).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('status')).toBeInTheDocument();

  responder(resposta([item({ texto: 'Aviso da outra loja' })]));
  expect(await screen.findByText('Aviso da outra loja')).toBeInTheDocument();
});

it('falha ao atualizar mantém a lista já carregada e avisa que não atualizou', async () => {
  getMensagensAutomaticas.mockResolvedValueOnce(resposta());
  renderizar();
  await screen.findByText('Seu pedido saiu para entrega');

  // Refetch (troca de período) falha: o que já estava na tela não pode sumir.
  getMensagensAutomaticas.mockRejectedValueOnce(new Error('rede'));
  fireEvent.change(screen.getByLabelText('Período'), { target: { value: '30' } });

  expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível atualizar/i);
  expect(screen.getByText('Seu pedido saiu para entrega')).toBeInTheDocument();
});
