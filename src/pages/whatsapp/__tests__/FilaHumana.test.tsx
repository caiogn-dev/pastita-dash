/**
 * Fila humana como balcão — quem está esperando uma pessoa, há quanto tempo,
 * por quê, e o botão que leva direto à conversa.
 *
 * Até 19/09 esta página lia `HandoverRequest`, tabela com ZERO linhas desde
 * sempre: nada no sistema a preenchia. A página vivia vazia enquanto 7
 * clientes esperavam resposta (e 57 tinham ficado sem resposta há dias).
 * Agora lê `/conversations/fila-humana/`, montada a partir das conversas.
 */
import React from 'react';
import { act, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HandoverRequestsPage } from '../HandoverRequestsPage';

jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'ce-saladas', storeName: 'Cê Saladas', store: null }),
}));

const getFilaHumana = jest.fn();
const assumir = jest.fn();
const devolverAoBot = jest.fn();
jest.mock('../../../services/conversations', () => ({
  __esModule: true,
  conversationsService: {
    getFilaHumana: (...a: unknown[]) => getFilaHumana(...a),
    assumir: (...a: unknown[]) => assumir(...a),
    devolverAoBot: (...a: unknown[]) => devolverAoBot(...a),
  },
}));

const AGORA = Date.parse('2026-09-26T12:00:00Z');

const item = (over: Record<string, unknown>) => ({
  id: 'c1', telefone: '5563999990001', nome: 'Joana',
  motivo: { codigo: 'pediu_atendente', texto: '', desde: '2026-09-26T11:40:00Z' },
  humano_desde: '2026-09-26T11:40:00Z', cliente_escreveu_em: '2026-09-26T11:48:00Z',
  minutos_esperando: 12, esperando_desde: '2026-09-26T11:48:00Z', esperando_ha_segundos: 720,
  ultima_mensagem: 'Oi, meu pedido já saiu?', ...over,
});

const fila = (esperando: unknown[], em_atendimento: unknown[] = [], resumo?: unknown) => ({
  esperando, em_atendimento,
  total_esperando: esperando.length, total_em_atendimento: em_atendimento.length,
  ...(resumo ? { resumo } : {}),
});

const OndeEstou = () => <p data-testid="onde">{useLocation().pathname + useLocation().search}</p>;

const renderizar = () => render(
  <MemoryRouter initialEntries={['/whatsapp/handover']}>
    <Routes>
      <Route path="/whatsapp/handover" element={<HandoverRequestsPage />} />
      <Route path="/inbox/whatsapp" element={<OndeEstou />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  jest.useFakeTimers({ now: AGORA, doNotFake: ['nextTick', 'setImmediate'] });
  getFilaHumana.mockReset();
  assumir.mockReset();
  devolverAoBot.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

it('mostra quem espera: motivo em português, tempo, última mensagem', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));

  renderizar();

  const linha = (await screen.findByText('Joana')).closest('li') as HTMLElement;
  expect(within(linha).getByText(/cliente pediu atendente/i)).toBeInTheDocument();
  expect(within(linha).getByText('há 12 min')).toBeInTheDocument();
  expect(within(linha).getByText(/meu pedido já saiu/)).toBeInTheDocument();
});

it('KPIs no topo: esperando, em atendimento e a espera mais antiga', async () => {
  getFilaHumana.mockResolvedValue(fila(
    [item({}), item({ id: 'c2', nome: 'Carlos', esperando_desde: '2026-09-26T11:58:00Z', esperando_ha_segundos: 120 })],
    [item({ id: 'c3', nome: 'Rita', minutos_esperando: 0, esperando_desde: null, esperando_ha_segundos: 0 })],
    { esperando: 2, em_atendimento: 1, mais_antiga_segundos: 720 },
  ));

  renderizar();

  const kpis = await screen.findByRole('region', { name: /agora no balcão/i });
  expect(within(kpis).getByText('Esperando').parentElement).toHaveTextContent('2');
  expect(within(kpis).getByText('Em atendimento').parentElement).toHaveTextContent('1');
  expect(within(kpis).getByText('Mais antiga').parentElement).toHaveTextContent('12 min');
});

it('ordena por maior espera, mesmo que a resposta venha fora de ordem', async () => {
  getFilaHumana.mockResolvedValue(fila([
    item({ id: 'c2', nome: 'Carlos', esperando_desde: '2026-09-26T11:58:00Z', esperando_ha_segundos: 120 }),
    item({}),
  ]));

  renderizar();

  await screen.findByText('Joana');
  const nomes = screen.getAllByTestId('nome-na-fila').map((n) => n.textContent);
  expect(nomes).toEqual(['Joana', 'Carlos']);
});

it('o tempo anda sozinho, sem nova busca', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));

  renderizar();
  const linha = (await screen.findByText('Joana')).closest('li') as HTMLElement;
  expect(within(linha).getByText('há 12 min')).toBeInTheDocument();

  act(() => { jest.advanceTimersByTime(60_000); });

  expect(within(linha).getByText('há 13 min')).toBeInTheDocument();
});

it('resposta antiga (motivo em texto, só minutos) continua funcionando', async () => {
  getFilaHumana.mockResolvedValue(fila([item({
    motivo: 'Respondido pelo WhatsApp do celular', esperando_desde: undefined, esperando_ha_segundos: undefined,
    minutos_esperando: 40,
  })]));

  renderizar();

  expect(await screen.findByText(/respondido pelo whatsapp do celular/i)).toBeInTheDocument();
  expect(screen.getAllByText('há 40 min').length).toBeGreaterThan(0);
});

it('pede a fila da loja selecionada', async () => {
  getFilaHumana.mockResolvedValue(fila([]));

  renderizar();

  await waitFor(() => expect(getFilaHumana).toHaveBeenCalledWith('ce-saladas'));
});

it('separa quem ficou sem resposta há mais de um dia', async () => {
  getFilaHumana.mockResolvedValue(fila([
    item({ id: 'velho', nome: 'Carlos', esperando_desde: '2026-09-23T12:00:00Z', esperando_ha_segundos: 3 * 86400 }),
    item({}),
  ]));

  renderizar();

  expect(await screen.findByText(/sem resposta há mais de 1 dia/i)).toBeInTheDocument();
  const linha = screen.getByText('Carlos').closest('li') as HTMLElement;
  expect(within(linha).getByText('há 3 dias')).toBeInTheDocument();
});

it('Assumir avisa o backend e leva direto para a conversa no inbox', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));
  assumir.mockResolvedValue({});

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /assumir/i }));

  await waitFor(() => expect(assumir).toHaveBeenCalledWith('c1'));
  expect(await screen.findByTestId('onde')).toHaveTextContent('/inbox/whatsapp?conversation=c1');
});

it('Assumir que falha fica na tela e diz o que houve', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));
  assumir.mockRejectedValue(new Error('500'));

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /assumir/i }));

  expect(await screen.findByText(/não foi possível assumir/i)).toBeInTheDocument();
  expect(screen.queryByTestId('onde')).not.toBeInTheDocument();
});

it('Devolver ao bot tira da fila', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));
  devolverAoBot.mockResolvedValue({});

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /devolver ao bot/i }));

  await waitFor(() => expect(devolverAoBot).toHaveBeenCalledWith('c1'));
  await waitFor(() => expect(screen.queryByText('Joana')).not.toBeInTheDocument());
});

it('Devolver que falha põe o cliente de volta e avisa', async () => {
  getFilaHumana.mockResolvedValue(fila([item({})]));
  devolverAoBot.mockRejectedValue(new Error('500'));

  renderizar();
  fireEvent.click(await screen.findByRole('button', { name: /devolver ao bot/i }));

  expect(await screen.findByText(/não foi possível devolver/i)).toBeInTheDocument();
  expect(screen.getByText('Joana')).toBeInTheDocument();
});

it('fila vazia diz que ninguém está esperando', async () => {
  getFilaHumana.mockResolvedValue(fila([]));

  renderizar();

  expect(await screen.findByText(/ninguém esperando/i)).toBeInTheDocument();
});

it('falha na consulta não vira "ninguém esperando"', async () => {
  getFilaHumana.mockRejectedValue(new Error('500'));

  renderizar();

  expect(await screen.findByText(/não foi possível carregar a fila/i)).toBeInTheDocument();
  expect(screen.queryByText(/ninguém esperando/i)).not.toBeInTheDocument();
});
