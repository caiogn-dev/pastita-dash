/**
 * Equipe e entregas: ranking por entregador e atendente + cadastro (do Prefiro).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const ranking = jest.fn();
const entregadores = jest.fn();
const criarEntregador = jest.fn();
jest.mock('../../../../services/operacao', () => ({
  __esModule: true,
  operacaoService: {
    ranking: (...a: unknown[]) => ranking(...a),
    entregadores: (...a: unknown[]) => entregadores(...a),
    criarEntregador: (...a: unknown[]) => criarEntregador(...a),
    mudarEntregador: jest.fn(),
  },
}));
jest.mock('../../../../services', () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'ce-saladas' } }),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

import EquipeEEntregasPage from '../EquipeEEntregasPage';

const tela = () => render(<MemoryRouter><EquipeEEntregasPage /></MemoryRouter>);

beforeEach(() => {
  ranking.mockReset().mockResolvedValue({
    dias: 30,
    entregadores: [{ id: 'e1', nome: 'João', entregas: 42, frete: 380, minutos_medios: 18 }],
    sem_entregador: 5,
    atendentes: [{ id: 1, nome: 'Ana', pedidos: 12, faturado: 640 }],
  });
  entregadores.mockReset().mockResolvedValue([{ id: 'e1', nome: 'João', telefone: '', is_active: true }]);
});

it('mostra o ranking dos dois lados e as entregas sem entregador', async () => {
  tela();
  // Tabela desenha a tabela (desktop) e o cartão (celular): o valor aparece nos dois.
  expect((await screen.findAllByText('42')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('18 min').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  expect(screen.getByText(/5 entregas ficaram sem entregador/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Gerenciar equipe' })).toHaveAttribute('href', '/colaboradores');
});

it('cadastra entregador', async () => {
  criarEntregador.mockResolvedValue({ id: 'e2', nome: 'Carlos', telefone: '', is_active: true });
  tela();
  fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Carlos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar entregador' }));
  await waitFor(() => expect(criarEntregador).toHaveBeenCalledWith('ce-saladas', { nome: 'Carlos', telefone: '' }));
  expect((await screen.findAllByText('Carlos')).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('switch', { name: 'Carlos ativo' }).length).toBeGreaterThan(0);
});
