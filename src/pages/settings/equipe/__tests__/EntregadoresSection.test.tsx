/**
 * Cadastro de entregadores — Configurações → Equipe desde 26/10 (antes morava
 * no fim de um relatório, em Pedidos → Equipe e entregas).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const entregadores = jest.fn();
const criarEntregador = jest.fn();
const mudarEntregador = jest.fn();
jest.mock('../../../../services/operacao', () => ({
  __esModule: true,
  operacaoService: {
    entregadores: (...a: unknown[]) => entregadores(...a),
    criarEntregador: (...a: unknown[]) => criarEntregador(...a),
    mudarEntregador: (...a: unknown[]) => mudarEntregador(...a),
  },
}));
jest.mock('../../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import { EntregadoresSection } from '../EntregadoresSection';

beforeEach(() => {
  entregadores.mockReset().mockResolvedValue([{ id: 'e1', nome: 'João', telefone: '63999990000', is_active: true }]);
});

it('lista, cadastra e liga/desliga entregador', async () => {
  criarEntregador.mockResolvedValue({ id: 'e2', nome: 'Carlos', telefone: '', is_active: true });
  mudarEntregador.mockResolvedValue({ id: 'e1', nome: 'João', telefone: '63999990000', is_active: false });
  render(<EntregadoresSection loja="ce-saladas" />);
  expect((await screen.findAllByText('João')).length).toBeGreaterThan(0);

  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carlos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar entregador' }));
  await waitFor(() => expect(criarEntregador).toHaveBeenCalledWith('ce-saladas', { nome: 'Carlos', telefone: '' }));
  expect((await screen.findAllByText('Carlos')).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('switch', { name: 'João ativo' })[0]);
  await waitFor(() => expect(mudarEntregador).toHaveBeenCalledWith('ce-saladas', 'e1', { is_active: false }));
});

it('falha ao carregar não vira "nenhum entregador"', async () => {
  entregadores.mockRejectedValue(new Error('500'));
  render(<EntregadoresSection loja="ce-saladas" />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
