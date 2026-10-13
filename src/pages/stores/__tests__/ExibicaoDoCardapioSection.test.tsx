/**
 * Exibição do cardápio (13/10, visto no Prefiro): o dono decide limite da
 * descrição ("ver mais"), foto (posição/encaixe/formato), estoque baixo,
 * esgotados e o texto do agradecimento. Grava por PATCH próprio
 * (`/stores/exibicao-do-cardapio/`), nunca pelo metadata inteiro.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

const ler = jest.fn();
const salvar = jest.fn();
jest.mock('../../../services/exibicaoDoCardapio', () => {
  const real = jest.requireActual('../../../services/exibicaoDoCardapio');
  return {
    ...real,
    exibicaoDoCardapioService: { ler: (...a: unknown[]) => ler(...a), salvar: (...a: unknown[]) => salvar(...a) },
  };
});

import ExibicaoDoCardapioSection from '../ExibicaoDoCardapioSection';
import { EXIBICAO_PADRAO } from '../../../services/exibicaoDoCardapio';

beforeEach(() => {
  jest.clearAllMocks();
  ler.mockResolvedValue({ ...EXIBICAO_PADRAO });
});

it('carrega o que está gravado', async () => {
  ler.mockResolvedValue({ ...EXIBICAO_PADRAO, descricao_limite: 90, mostrar_esgotados: false });
  render(<ExibicaoDoCardapioSection loja="loja-x" />);
  expect(await screen.findByLabelText(/ver mais a partir de/i)).toHaveValue(90);
  expect(screen.getByRole('switch', { name: /mostrar esgotados/i })).toHaveAttribute('aria-checked', 'false');
  expect(ler).toHaveBeenCalledWith('loja-x');
});

it('salva só o que mudou e avisa a página', async () => {
  salvar.mockResolvedValue({ ...EXIBICAO_PADRAO, foto_posicao: 'direita', foto_encaixe: 'inteira' });
  const onSalvo = jest.fn();
  render(<ExibicaoDoCardapioSection loja="loja-x" onSalvo={onSalvo} />);
  await screen.findByLabelText(/ver mais a partir de/i);

  fireEvent.click(screen.getByRole('radio', { name: /direita/i }));
  fireEvent.click(screen.getByRole('radio', { name: /inteira/i }));
  fireEvent.click(screen.getByRole('button', { name: /salvar exibição/i }));

  await waitFor(() => expect(salvar).toHaveBeenCalledWith('loja-x', { foto_posicao: 'direita', foto_encaixe: 'inteira' }));
  expect(onSalvo).toHaveBeenCalled();
  expect(await screen.findByText(/exibição salva/i)).toBeInTheDocument();
});

it('erro do servidor aparece na tela', async () => {
  salvar.mockRejectedValue({ response: { data: { error: 'Texto com no máximo 60 caracteres.' } } });
  render(<ExibicaoDoCardapioSection loja="loja-x" />);
  const titulo = await screen.findByLabelText(/^título do agradecimento/i);
  fireEvent.change(titulo, { target: { value: 'Valeu' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar exibição/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('60 caracteres');
});
