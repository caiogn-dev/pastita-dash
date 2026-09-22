/**
 * Sem Instagram conectado a tela não pode mostrar formulário: ela mostra o
 * caminho para conectar. Com conta, a loja vê o placar de cada promoção.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PromocaoNoInstagramPage from '../PromocaoNoInstagramPage';

const listarContas = jest.fn();
const listarPromocoes = jest.fn();
const placar = jest.fn();

jest.mock('../../../../services/instagram', () => ({
  __esModule: true,
  instagramAccountService: { list: (...a: unknown[]) => listarContas(...a) },
}));
jest.mock('../../../../services/instagramCampanhas', () => ({
  __esModule: true,
  instagramCampanhasService: {
    listar: (...a: unknown[]) => listarPromocoes(...a),
    placar: (...a: unknown[]) => placar(...a),
  },
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const tela = () => render(<MemoryRouter><PromocaoNoInstagramPage /></MemoryRouter>);

beforeEach(() => {
  listarContas.mockReset().mockResolvedValue({ data: [{ id: 'a1', is_active: true }] });
  listarPromocoes.mockReset().mockResolvedValue([]);
  placar.mockReset().mockResolvedValue({ participando: 0, de_fora: 0, ganhadores: [], motivos: [] });
});

it('sem conta conectada, oferece conectar em vez do formulário', async () => {
  listarContas.mockResolvedValue({ data: [] });

  tela();

  expect(await screen.findByText(/Conecte o Instagram da loja/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Nova promoção/ })).not.toBeInTheDocument();
});

it('com conta e nenhuma promoção, explica o que dá para fazer', async () => {
  tela();

  expect(await screen.findByText(/Nenhuma promoção ainda/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Nova promoção/ })).toBeInTheDocument();
});

it('mostra a regra e o placar de cada promoção', async () => {
  listarPromocoes.mockResolvedValue([{
    id: 'p1', account: 'a1', nome: 'Cupom de setembro', tipo: 'SORTEIO', media_id: 'm1',
    palavra_chave: 'EU QUERO', exige_marcar_amigos: 2, exige_seguir: true,
    mensagem_dm: 'oi', resposta_publica: '', comeca_em: null, termina_em: null,
    ativa: true, participando: 12, no_ar: true, created_at: '2026-09-21T10:00:00Z',
  }]);
  placar.mockResolvedValue({
    participando: 12, de_fora: 4, ganhadores: [],
    motivos: [{ motivo: 'não escreveu a palavra da promoção', quantas: 4 }],
  });

  tela();

  expect(await screen.findByText('Cupom de setembro')).toBeInTheDocument();
  expect(screen.getByText('Comente "EU QUERO", marque 2 amigos e siga a loja para receber no direct.'))
    .toBeInTheDocument();
  expect(await screen.findByText(/4 não escreveu a palavra da promoção/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sortear' })).toBeInTheDocument();
});
