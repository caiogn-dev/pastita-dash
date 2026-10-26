/**
 * Ranking da equipe (entregadores e atendentes) — Relatórios › Operação ›
 * Equipe desde 26/10. Antes era "Equipe e entregas" em Pedidos, misturando
 * relatório com cadastro; o cadastro foi para Configurações → Equipe.
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

import { EquipeSection, diasDoPeriodo } from '../EquipeSection';

const tela = (period: '7d' | '30d' | '90d' = '30d') =>
  render(<MemoryRouter><EquipeSection range={{ period }} /></MemoryRouter>);

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

it('usa o período do relatório, não um seletor próprio', async () => {
  tela('7d');
  await screen.findAllByText('42');
  expect(ranking).toHaveBeenCalledWith('ce-saladas', 7);
  expect(screen.queryByRole('button', { name: '30 dias' })).toBeNull();
});

it('converte cada período do relatório em dias', () => {
  expect(diasDoPeriodo({ period: 'hoje' })).toBe(1);
  expect(diasDoPeriodo({ period: '90d' })).toBe(90);
  expect(diasDoPeriodo({ period: '1y' })).toBe(365);
  expect(diasDoPeriodo({ start_date: '2026-10-01', end_date: '2026-10-10' })).toBe(10);
});
