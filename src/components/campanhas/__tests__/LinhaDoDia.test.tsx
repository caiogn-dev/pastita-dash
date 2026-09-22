/**
 * A barra por hora precisa dizer, sem tooltip, quanta gente recebe e quando.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LinhaDoDia } from '../LinhaDoDia';

const faixas = [{ hora: 11, quantidade: 3 }, { hora: 20, quantidade: 12 }];

it('resume os dois números acima da linha', () => {
  render(<LinhaDoDia faixas={faixas} horarioDaCampanha="2026-09-18T20:00" agora="2026-09-18T11:30" />);

  expect(screen.getByText('12 recebem às 20h · 3 antes, para não perder a janela')).toBeInTheDocument();
});

it('cada hora do dia tem rótulo acessível com quantas pessoas', () => {
  render(<LinhaDoDia faixas={faixas} horarioDaCampanha="2026-09-18T20:00" agora="2026-09-18T11:30" />);

  expect(screen.getByLabelText('20 horas: 12 pessoas')).toBeInTheDocument();
  expect(screen.getByLabelText('11 horas: 3 pessoas')).toBeInTheDocument();
});

it('campanha rodando mostra o que já saiu e o que falta', () => {
  render(
    <LinhaDoDia
      aoVivo
      faixas={[{ hora: 11, enviadas: 3, aguardando: 0 }, { hora: 20, enviadas: 0, aguardando: 12 }]}
      horarioDaCampanha="2026-09-18T20:00"
      agora="2026-09-18T11:30"
    />,
  );

  expect(screen.getByText('Como está saindo hoje')).toBeInTheDocument();
  expect(screen.getByText(/3 já receberam · 12 ainda no aguardo/)).toBeInTheDocument();
});

it('sem ninguém na janela, diz isso em vez de desenhar barras vazias', () => {
  render(<LinhaDoDia faixas={[]} horarioDaCampanha="2026-09-18T20:00" agora="2026-09-18T11:30" />);

  expect(screen.getByText('Ninguém recebe nesse horário')).toBeInTheDocument();
});
