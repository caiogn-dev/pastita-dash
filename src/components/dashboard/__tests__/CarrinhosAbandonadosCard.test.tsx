/**
 * Carrinhos abandonados na página inicial.
 *
 * 19/09: R$ 7.782,96 em 51 carrinhos numa semana — dado guardado em
 * `store_carts` que o painel nunca mostrou. Falha na consulta não pode virar
 * "R$ 0" (mesma lição do card de avaliações).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CarrinhosAbandonadosCard } from '../CarrinhosAbandonadosCard';

const getCarrinhosAbandonados = jest.fn();
jest.mock('../../../services/reports', () => ({
  __esModule: true,
  getCarrinhosAbandonados: (...a: unknown[]) => getCarrinhosAbandonados(...a),
}));

beforeEach(() => getCarrinhosAbandonados.mockReset());

it('mostra o valor parado, quantos carrinhos e os produtos', async () => {
  getCarrinhosAbandonados.mockResolvedValue({
    dias: 7, carrinhos: 51, valor_total: 7782.96, identificados: 2, com_lembrete: 1,
    produtos: [{ nome: 'Salmão Sublime', carrinhos: 12 }],
  });

  render(<CarrinhosAbandonadosCard storeSlug="ce-saladas" />);

  expect(await screen.findByText(/7\.782,96/)).toBeInTheDocument();
  expect(screen.getByText(/51 carrinhos/)).toBeInTheDocument();
  expect(screen.getByText(/Salmão Sublime/)).toBeInTheDocument();
  expect(getCarrinhosAbandonados).toHaveBeenCalledWith('ce-saladas', 7);
});

it('semana sem abandono diz isso, sem card vazio', async () => {
  getCarrinhosAbandonados.mockResolvedValue({
    dias: 7, carrinhos: 0, valor_total: 0, identificados: 0, com_lembrete: 0, produtos: [],
  });

  render(<CarrinhosAbandonadosCard storeSlug="ce-saladas" />);

  expect(await screen.findByText(/nenhum carrinho abandonado/i)).toBeInTheDocument();
});

it('falha na consulta não vira R$ 0', async () => {
  getCarrinhosAbandonados.mockRejectedValue(new Error('500'));

  render(<CarrinhosAbandonadosCard storeSlug="ce-saladas" />);

  expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument();
  expect(screen.queryByText(/R\$ 0/)).not.toBeInTheDocument();
});
