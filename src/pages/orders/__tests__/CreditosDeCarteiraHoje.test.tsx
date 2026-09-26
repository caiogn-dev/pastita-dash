/**
 * Compra de saldo (carteira) aparece no quadro como o que é — e não some.
 *
 * 26/09: Flaviane comprou o Pacote Leve; o push disse "Novo pedido", o
 * quadro não mostrava nada (venda de saldo não entra nele) e o dono achou
 * que o pedido tinha sumido sem imprimir.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../services/orders', () => ({
  __esModule: true,
  default: { getOrders: jest.fn() },
}));

import ordersService from '../../../services/orders';
const { getOrders } = ordersService;
import CreditosDeCarteiraHoje, { creditoDoPedido, hojeIso } from '../CreditosDeCarteiraHoje';
import { EVENTO_COMPRA_DE_CARTEIRA, ehCompraDeCarteira, textoDaCompraDeCarteira } from '../../../hooks/orderRealtimeEvents';
import type { Order } from '../../../types';

const pedidoDeCarteira = {
  id: 'p1', order_number: 'CE-2609267553', customer_name: 'Flaviane Paes', total: 139,
  created_at: '2026-09-26T12:29:19Z', source: 'carteira',
  metadata: { origem: 'carteira_prepaga', credito_concedido: '152.00' },
} as unknown as Order;

const mockGetOrders = getOrders as jest.Mock;

describe('creditoDoPedido', () => {
  it('lê nome, quanto pagou e quanto ganhou de saldo', () => {
    const c = creditoDoPedido(pedidoDeCarteira);
    expect(c.nome).toBe('Flaviane Paes');
    expect(c.pagou).toBe(139);
    expect(c.saldo).toBe(152);
  });

  it('sem crédito no metadata cai no total', () => {
    const c = creditoDoPedido({ ...pedidoDeCarteira, metadata: {} } as Order);
    expect(c.saldo).toBe(139);
  });

  it('hojeIso é a data local em AAAA-MM-DD', () => {
    expect(hojeIso(new Date(2026, 8, 26, 10))).toBe('2026-09-26');
  });
});

describe('evento em tempo real de carteira', () => {
  it('reconhece a venda de saldo e monta o texto do aviso', () => {
    const e = { source: 'carteira', customer_name: 'Flaviane', total: '139.00', credito_concedido: '152.00', order_id: 'p1' };
    expect(ehCompraDeCarteira(e)).toBe(true);
    expect(ehCompraDeCarteira({ source: 'web' })).toBe(false);
    expect(textoDaCompraDeCarteira(e, (v) => `R$ ${v}`)).toBe('💳 Flaviane comprou R$ 152 de saldo (pagou R$ 139). Não é pedido.');
  });
});

describe('<CreditosDeCarteiraHoje />', () => {
  beforeEach(() => mockGetOrders.mockReset());

  it('pede só as vendas de carteira de hoje e mostra quem comprou', async () => {
    mockGetOrders.mockResolvedValue({ results: [pedidoDeCarteira] });
    render(<MemoryRouter><CreditosDeCarteiraHoje storeSlug="ce-saladas" /></MemoryRouter>);

    expect(await screen.findByText(/1 compra de saldo hoje/)).toBeInTheDocument();
    expect(screen.getByText('Flaviane Paes')).toBeInTheDocument();
    expect(screen.getByText(/não é pedido/i)).toBeInTheDocument();
    const params = mockGetOrders.mock.calls[0][0];
    expect(params).toMatchObject({ store: 'ce-saladas', source: 'carteira', date_from: hojeIso() });
  });

  it('sem compra hoje não ocupa espaço', async () => {
    mockGetOrders.mockResolvedValue({ results: [] });
    const { container } = render(<MemoryRouter><CreditosDeCarteiraHoje storeSlug="ce-saladas" /></MemoryRouter>);
    await waitFor(() => expect(mockGetOrders).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });

  it('recarrega quando o tempo real avisa uma compra', async () => {
    mockGetOrders.mockResolvedValueOnce({ results: [] }).mockResolvedValueOnce({ results: [pedidoDeCarteira] });
    render(<MemoryRouter><CreditosDeCarteiraHoje storeSlug="ce-saladas" /></MemoryRouter>);
    await waitFor(() => expect(mockGetOrders).toHaveBeenCalledTimes(1));

    act(() => { window.dispatchEvent(new CustomEvent(EVENTO_COMPRA_DE_CARTEIRA)); });

    expect(await screen.findByText('Flaviane Paes')).toBeInTheDocument();
  });
});
