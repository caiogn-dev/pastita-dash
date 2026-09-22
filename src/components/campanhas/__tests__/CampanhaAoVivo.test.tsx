/**
 * O dono precisa entender por que "12 de 40" às 11h não é campanha travada.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CampanhaAoVivo } from '../CampanhaAoVivo';

const getFaixasDaCampanha = jest.fn();
jest.mock('../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: { getFaixasDaCampanha: (...a: unknown[]) => getFaixasDaCampanha(...a) },
}));

const dados = {
  faixas: [
    { hora: 11, enviadas: 3, aguardando: 0 },
    { hora: 20, enviadas: 0, aguardando: 12 },
  ],
  proxima_faixa: 20,
  fora_da_janela: 4,
};

beforeEach(() => getFaixasDaCampanha.mockReset().mockResolvedValue(dados));

it('mostra o que já saiu e o que ainda falta', async () => {
  render(<CampanhaAoVivo campanhaId="c1" horarioDaCampanha="2026-09-18T20:00" />);

  expect(await screen.findByText(/3 já receberam · 12 ainda no aguardo/)).toBeInTheDocument();
});

it('diz qual é a próxima leva e quem fica de fora hoje', async () => {
  render(<CampanhaAoVivo campanhaId="c1" horarioDaCampanha="2026-09-18T20:00" />);

  expect(await screen.findByText(/Próxima leva às 20h/)).toBeInTheDocument();
  expect(screen.getByText(/4 ficam de fora hoje/)).toBeInTheDocument();
});

it('quando tudo já saiu, diz isso', async () => {
  getFaixasDaCampanha.mockResolvedValue({ ...dados, proxima_faixa: null, fora_da_janela: 0 });

  render(<CampanhaAoVivo campanhaId="c1" />);

  expect(await screen.findByText(/Todas as levas do dia já saíram/)).toBeInTheDocument();
});

it('falha ao carregar não vira "nada saiu"', async () => {
  getFaixasDaCampanha.mockRejectedValue(new Error('rede'));

  render(<CampanhaAoVivo campanhaId="c1" />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar o andamento/i);
});
