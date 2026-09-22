/**
 * Ver o post por dentro: quem comentou, quem recebeu e quem ficou de fora.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { ComentariosDoPost } from '../ComentariosDoPost';

const comentarios = jest.fn();

jest.mock('../../../../services/instagramCampanhas', () => ({
  __esModule: true,
  instagramCampanhasService: { comentarios: (...a: unknown[]) => comentarios(...a) },
}));

const LISTA = [
  { id: 'c1', username: 'ana', texto: 'EU QUERO', quando: '2026-09-21T10:00:00Z', curtidas: 2, situacao: 'recebeu', motivo: '', ganhador: false },
  { id: 'c2', username: 'bia', texto: 'que lindo', quando: '2026-09-21T10:05:00Z', curtidas: 0, situacao: 'de_fora', motivo: 'não escreveu a palavra da promoção', ganhador: false },
  { id: 'c3', username: 'caio', texto: 'EU QUERO', quando: '2026-09-21T10:07:00Z', curtidas: 0, situacao: 'aguardando', motivo: '', ganhador: false },
];

beforeEach(() => comentarios.mockReset().mockResolvedValue(LISTA));

it('mostra cada comentário com o que aconteceu', async () => {
  render(<ComentariosDoPost campanhaId="p1" />);

  expect(await screen.findByText('@ana')).toBeInTheDocument();
  expect(screen.getByText('Recebeu no direct')).toBeInTheDocument();
  expect(screen.getByText('não escreveu a palavra da promoção')).toBeInTheDocument();
  expect(screen.getByText('Chegando agora')).toBeInTheDocument();
});

it('token recusado manda reconectar em vez de dizer que não há comentário', async () => {
  comentarios.mockRejectedValue({ response: { status: 409 } });

  render(<ComentariosDoPost campanhaId="p1" />);

  expect(await screen.findByText(/Reconecte o Instagram/)).toBeInTheDocument();
});

it('post sem comentário nenhum explica em vez de ficar vazio', async () => {
  comentarios.mockResolvedValue([]);

  render(<ComentariosDoPost campanhaId="p1" />);

  expect(await screen.findByText(/Ninguém comentou neste post ainda/)).toBeInTheDocument();
});
