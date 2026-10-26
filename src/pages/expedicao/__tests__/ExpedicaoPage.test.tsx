/**
 * A Expedição só mostrava o que acabou de ser bipado — quem estava pronto
 * esperando saída ficava invisível até alguém procurar a comanda (26/10).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpedicaoPage from '../ExpedicaoPage';
import { getOrders } from '../../../services/storesApi';

jest.mock('../../../hooks', () => ({ useStore: () => ({ storeId: 'u1', storeSlug: 'loja-1' }) }));
jest.mock('../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../services/storesApi', () => ({ getOrders: jest.fn(), updateOrderStatus: jest.fn() }));
const pedidos = getOrders as jest.Mock;

const pagina = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

it('lista os pedidos prontos esperando saída, separando entrega de retirada', async () => {
  pedidos.mockResolvedValue(pagina([
    { id: 'a', order_number: 'CE-1', customer_name: 'Ana', status: 'ready', delivery_method: 'delivery' },
    { id: 'b', order_number: 'CE-2', customer_name: 'Bia', status: 'ready', delivery_method: 'pickup' },
  ]));
  render(<MemoryRouter><ExpedicaoPage /></MemoryRouter>);

  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getByText('Bia')).toBeInTheDocument();
  expect(screen.getByText(/prontos para sair \(2\)/i)).toBeInTheDocument();
  expect(screen.getByText('Entrega')).toBeInTheDocument();
  expect(screen.getByText('Retirada')).toBeInTheDocument();
  await waitFor(() =>
    expect(pedidos).toHaveBeenCalledWith(expect.objectContaining({ store: 'loja-1', status: 'ready' })));
});

it('sem pedido pronto, não desenha lista vazia', async () => {
  pedidos.mockResolvedValue(pagina([]));
  render(<MemoryRouter><ExpedicaoPage /></MemoryRouter>);
  await waitFor(() => expect(pedidos).toHaveBeenCalled());
  expect(screen.queryByText(/prontos para sair/i)).toBeNull();
});
