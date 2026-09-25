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
  situacao_desde: '2026-09-24T22:00:00Z',
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
    // Relógio fixo no MESMO dia da parada (24/09, no fuso da loja): a faixa
    // mostra só "19:00". Sem fixar o relógio, o teste passava no dia em que foi
    // escrito e virava vermelho no dia seguinte — quando `desdeQuando` passa a
    // prefixar a data ("24/09 19:00") por ser um dia anterior. É o mesmo cuidado
    // de baseline determinístico já aplicado à suíte de fuso.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-24T23:00:00Z'));
    try {
      listar.mockResolvedValue({ data: { results: [PARADA] } });
      abrir();
      await act(async () => { await Promise.resolve(); });

      const faixa = screen.getByRole('alert');
      expect(faixa).toHaveTextContent('Impressora da cozinha parada desde 19:00 — EPSON TM-T20 não responde');
      expect(faixa.className).toMatch(/--danger/);
      expect(screen.getByRole('link', { name: /ver impressão/i })).toHaveAttribute('href', '/stores/loja-x/printing');
      expect(listar).toHaveBeenCalledWith('loja-x');
    } finally {
      jest.useRealTimers();
    }
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
