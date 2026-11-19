/**
 * Delivery e pagamento na aba Integrações: 99Food, iFood e Mercado Pago, lidos
 * de GET /stores/integracoes/?store=<loja>.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CanaisDaLoja } from '../CanaisDaLoja';

const get = jest.fn();
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => get(...a) },
}));

let loja: { storeId: string | null; storeSlug: string | null } = { storeId: 'id-1', storeSlug: 'ce' };
jest.mock('../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => loja,
}));

const estado = (over: Record<string, unknown> = {}) => ({
  '99food': { ativo: false, ultimo_pedido_em: null, pedidos_30_dias: 0 },
  ifood: { disponivel: false, conectado: false, loja: '', erro: '' },
  mercado_pago: { conectado: false },
  ...over,
});

const renderizar = () => render(<MemoryRouter><CanaisDaLoja /></MemoryRouter>);
const cartao = (nome: string) => screen.getByRole('heading', { name: nome }).closest('section') as HTMLElement;

beforeEach(() => {
  get.mockReset();
  loja = { storeId: 'id-1', storeSlug: 'ce' };
});

it('pede o estado da loja selecionada', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: '99Food' });
  expect(get).toHaveBeenCalledWith('/stores/integracoes/', { params: { store: 'id-1' } });
});

it('99Food recebendo mostra os pedidos do mês e leva ao histórico filtrado', async () => {
  get.mockResolvedValue({ data: estado({ '99food': { ativo: true, ultimo_pedido_em: '2026-11-18T12:00:00Z', pedidos_30_dias: 42 } }) });
  renderizar();
  const c = await screen.findByRole('heading', { name: '99Food' }).then(() => cartao('99Food'));
  expect(within(c).getByText('Recebendo pedidos')).toBeInTheDocument();
  expect(within(c).getByText(/42 pedidos em 30 dias/)).toBeInTheDocument();
  expect(within(c).getByRole('link', { name: 'Ver pedidos' })).toHaveAttribute('href', '/stores/ce/orders/historico?canal=99food');
});

it('iFood sem app da plataforma aparece como em breve, sem botão', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: 'iFood' });
  const c = cartao('iFood');
  expect(within(c).getByText('Em breve')).toBeInTheDocument();
  expect(within(c).queryByRole('button')).toBeNull();
});

it('iFood conectado mostra o nome da loja no iFood', async () => {
  get.mockResolvedValue({ data: estado({ ifood: { disponivel: true, conectado: true, loja: 'Cê Saladas Palmas', erro: '' } }) });
  renderizar();
  await screen.findByRole('heading', { name: 'iFood' });
  expect(within(cartao('iFood')).getByText('Cê Saladas Palmas')).toBeInTheDocument();
  expect(within(cartao('iFood')).getByText('Recebendo pedidos')).toBeInTheDocument();
});

it('Mercado Pago sem conta leva para conectar em Pagamentos', async () => {
  get.mockResolvedValue({ data: estado() });
  renderizar();
  await screen.findByRole('heading', { name: 'Mercado Pago' });
  expect(within(cartao('Mercado Pago')).getByRole('link', { name: 'Conectar' })).toHaveAttribute('href', '/stores/ce/payments');
});

it('Mercado Pago conectado vira "Gerenciar"', async () => {
  get.mockResolvedValue({ data: estado({ mercado_pago: { conectado: true } }) });
  renderizar();
  await screen.findByRole('heading', { name: 'Mercado Pago' });
  const c = cartao('Mercado Pago');
  expect(within(c).getByText('Recebendo na sua conta')).toBeInTheDocument();
  expect(within(c).getByRole('link', { name: 'Gerenciar' })).toBeInTheDocument();
});

it('falha ao carregar não finge "não conectado"', async () => {
  get.mockRejectedValue(new Error('rede'));
  renderizar();
  expect(await screen.findByRole('alert')).toHaveTextContent(/delivery e pagamento/i);
  expect(screen.queryByRole('heading', { name: '99Food' })).toBeNull();
});

it('sem loja selecionada não chama a API', () => {
  loja = { storeId: null, storeSlug: null };
  renderizar();
  expect(get).not.toHaveBeenCalled();
});
