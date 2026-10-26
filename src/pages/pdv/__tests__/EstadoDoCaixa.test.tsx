/**
 * O PDV vendia em dinheiro sem saber se o caixa estava aberto — e venda em
 * dinheiro com o caixa fechado não entra no "esperado" de fechamento nenhum
 * (26/10).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EstadoDoCaixa } from '../EstadoDoCaixa';
import { getCurrentCashSession } from '../../../services/cash';

jest.mock('../../../services/cash', () => ({ getCurrentCashSession: jest.fn() }));
const atual = getCurrentCashSession as jest.Mock;

const tela = () => render(<MemoryRouter><EstadoDoCaixa loja="loja-1" /></MemoryRouter>);

it('caixa fechado: avisa e leva a abrir', async () => {
  atual.mockRejectedValue({ response: { status: 404 } });
  tela();
  const link = await screen.findByRole('link', { name: /abrir caixa/i });
  expect(link).toHaveAttribute('href', '/stores/loja-1/cash');
  expect(screen.getByText(/caixa fechado/i)).toBeInTheDocument();
});

it('caixa aberto: diz que está aberto, sem botão', async () => {
  atual.mockResolvedValue({ data: { status: 'open' } });
  tela();
  expect(await screen.findByText(/caixa aberto/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /abrir caixa/i })).toBeNull();
});

it('falha de rede não inventa "fechado"', async () => {
  atual.mockRejectedValue(new Error('rede'));
  const { container } = tela();
  await new Promise((r) => setTimeout(r, 0));
  expect(container.textContent).toBe('');
});
