/**
 * Criar promoção é escolher uma foto e escrever duas frases.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NovaPromocao from '../NovaPromocao';

const publicacoes = jest.fn();
const criar = jest.fn();

jest.mock('../../../../services/instagramCampanhas', () => ({
  __esModule: true,
  instagramCampanhasService: {
    publicacoes: (...a: unknown[]) => publicacoes(...a),
    criar: (...a: unknown[]) => criar(...a),
  },
}));

const POSTS = [
  { id: 'p1', legenda: 'Salada nova', imagem: 'https://cdn/1.jpg', link: null, tipo: 'IMAGE', quando: '', comentarios: 12 },
  { id: 'p2', legenda: '', imagem: 'https://cdn/2.jpg', link: null, tipo: 'VIDEO', quando: '', comentarios: 1 },
];

beforeEach(() => {
  publicacoes.mockReset().mockResolvedValue(POSTS);
  criar.mockReset().mockResolvedValue({ id: 'nova' });
});

const tela = (onCriada = jest.fn()) =>
  render(<NovaPromocao contaId="a1" onCriada={onCriada} onCancelar={jest.fn()} />);

it('mostra as publicações da conta com quantos comentários cada uma tem', async () => {
  tela();

  expect(await screen.findByAltText('Salada nova')).toBeInTheDocument();
  expect(screen.getByText('12 comentários')).toBeInTheDocument();
  expect(screen.getByText('1 comentário')).toBeInTheDocument();
});

it('escolher a foto já leva para a regra', async () => {
  const user = userEvent.setup();
  tela();

  await user.click(await screen.findByAltText('Salada nova'));

  expect(await screen.findByText('Palavra da promoção')).toBeInTheDocument();
});

it('a legenda sugerida acompanha as regras escolhidas', async () => {
  const user = userEvent.setup();
  tela();
  await user.click(await screen.findByAltText('Salada nova'));

  await user.type(screen.getByPlaceholderText('EU QUERO'), 'QUERO');
  await user.click(screen.getByRole('button', { name: 'Seguir a loja' }));

  expect(await screen.findByText(/Comente "QUERO" e siga a loja para receber no direct\./))
    .toBeInTheDocument();
});

it('cria a promoção com o post escolhido e nome derivado da palavra', async () => {
  const user = userEvent.setup();
  const onCriada = jest.fn();
  tela(onCriada);
  await user.click(await screen.findByAltText('Salada nova'));
  await user.type(screen.getByPlaceholderText('EU QUERO'), 'quero');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  await user.type(screen.getByPlaceholderText(/Seu cupom é SET10/), 'cupom SET10');

  await user.click(screen.getByRole('button', { name: 'Colocar no ar' }));

  await waitFor(() => expect(criar).toHaveBeenCalled());
  expect(criar.mock.calls[0][0]).toMatchObject({
    account: 'a1', media_id: 'p1', palavra_chave: 'quero',
    mensagem_dm: 'cupom SET10', nome: 'Promoção "QUERO"',
  });
  expect(onCriada).toHaveBeenCalled();
});

it('token recusado explica em vez de dizer "sem publicações"', async () => {
  publicacoes.mockRejectedValue({ response: { status: 409 } });

  tela();

  expect(await screen.findByText(/Instagram precisa ser reconectado/)).toBeInTheDocument();
});
