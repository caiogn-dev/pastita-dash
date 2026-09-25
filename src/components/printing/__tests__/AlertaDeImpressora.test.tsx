import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const listar = jest.fn();
jest.mock('../../../services/printing', () => ({
  listPrintAgents: (...a: unknown[]) => listar(...a),
}));

import { AlertaDeImpressora } from '../AlertaDeImpressora';

const PARADA = {
  id: 'a1',
  name: 'Caixa',
  station: 'kitchen',
  is_active: true,
  situacao: 'impressora_indisponivel',
  // uma hora atrás: sempre "hoje", então a frase mostra só a hora
  situacao_desde: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  situacao_detalhe: 'EPSON TM-T20 não responde — 10 impressões presas no Windows',
};

const abrir = () =>
  render(
    <MemoryRouter>
      <AlertaDeImpressora storeSlug="loja-x" />
    </MemoryRouter>,
  );

beforeEach(() => jest.clearAllMocks());

describe('<AlertaDeImpressora />', () => {
  it('impressora parada: faixa vermelha com link para a tela de Impressão', async () => {
    listar.mockResolvedValue({ data: { results: [PARADA] } });
    abrir();

    const faixa = await screen.findByRole('alert');
    expect(faixa).toHaveTextContent(/Impressora da cozinha parada desde \d{2}:\d{2} — EPSON TM-T20 não responde/);
    expect(faixa.className).toMatch(/--danger/);
    expect(screen.getByRole('link', { name: /ver impressão/i })).toHaveAttribute('href', '/stores/loja-x/printing');
    expect(listar).toHaveBeenCalledWith('loja-x');
  });

  it('offline: faixa amarela', async () => {
    listar.mockResolvedValue({ data: [{ ...PARADA, situacao: 'offline' }] });
    abrir();
    expect((await screen.findByRole('alert')).className).toMatch(/--warning/);
  });

  it('tudo ok: nada na tela', async () => {
    listar.mockResolvedValue({ data: [{ ...PARADA, situacao: 'ok' }] });
    abrir();
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro ao buscar não inventa alarme', async () => {
    listar.mockRejectedValue(new Error('rede'));
    abrir();
    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('confere de novo a cada 60 s e some quando volta ao normal', async () => {
    jest.useFakeTimers();
    try {
      listar.mockResolvedValueOnce({ data: [PARADA] }).mockResolvedValue({ data: [{ ...PARADA, situacao: 'ok' }] });
      abrir();
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await act(async () => { jest.advanceTimersByTime(60_000); await Promise.resolve(); });
      expect(listar).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
