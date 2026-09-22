/**
 * O recuperador de vendas: quanto ficou no carrinho e quanto voltou.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import RecuperacaoPage from '../RecuperacaoPage';

const painel = jest.fn();
jest.mock('../../../../services/recuperacao', () => ({
  __esModule: true,
  recuperacaoService: { painel: (...a: unknown[]) => painel(...a) },
}));
jest.mock('../../../../hooks/useStore', () => ({
  __esModule: true,
  useStore: () => ({ store: { slug: 'ce-saladas', name: 'Cê' }, isStoreSelected: true }),
}));

const DADOS = {
  dias: 30, abandonados: 12, valor_abandonado: 1000, ticket_medio: 83.33,
  mensagens_enviadas: 9, recuperados: 3, valor_recuperado: 240,
  taxa_de_recuperacao: 25, oportunidade_perdida: 760, sem_telefone: 40,
};

const tela = () => render(<MemoryRouter><RecuperacaoPage /></MemoryRouter>);

beforeEach(() => painel.mockReset().mockResolvedValue(DADOS));

it('mostra o dinheiro que está na mesa', async () => {
  tela();

  expect(await screen.findByText(/R\$\s*760/)).toBeInTheDocument();
  expect(screen.getByText('Oportunidade perdida')).toBeInTheDocument();
});

it('mostra quantos voltaram e a taxa', async () => {
  tela();

  expect(await screen.findByText('Voltaram e compraram')).toBeInTheDocument();
  expect(screen.getByText(/25% dos abandonados/)).toBeInTheDocument();
});

it('sem carrinho abandonado, explica em vez de mostrar zeros soltos', async () => {
  painel.mockResolvedValue({ ...DADOS, abandonados: 0, recuperados: 0, valor_abandonado: 0,
    valor_recuperado: 0, oportunidade_perdida: 0, taxa_de_recuperacao: 0, mensagens_enviadas: 0 });

  tela();

  expect(await screen.findByText(/Nenhum carrinho abandonado/)).toBeInTheDocument();
});

it('diz quantos carrinhos não tinham telefone — explica a taxa baixa', async () => {
  tela();

  expect(await screen.findByText(/não há para onde mandar o/)).toBeInTheDocument();
  expect(screen.getByText('40')).toBeInTheDocument();
});

it('falha de carga não vira "nada aconteceu"', async () => {
  painel.mockRejectedValue(new Error('rede'));

  tela();

  expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
});
