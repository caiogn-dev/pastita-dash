/**
 * O construtor monta a pergunta e diz quantos são antes de gastar envio.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ConstrutorDeRegras from '../ConstrutorDeRegras';

const campos = jest.fn();
const previa = jest.fn();

jest.mock('../../../../services/campaigns', () => ({
  __esModule: true,
  campaignsService: {
    camposDaAudiencia: (...a: unknown[]) => campos(...a),
    previaPorRegra: (...a: unknown[]) => previa(...a),
  },
}));

const CATALOGO = [
  {
    campo: 'pedidos', rotulo: 'Pedidos feitos', tipo: 'numero',
    operadores: ['maior_que', 'entre'],
    operadores_detalhe: [
      { operador: 'maior_que', rotulo: 'é maior que' },
      { operador: 'entre', rotulo: 'está entre', valores: 2 },
    ],
  },
  {
    campo: 'bairro', rotulo: 'Bairro', tipo: 'texto',
    operadores: ['contem'],
    operadores_detalhe: [{ operador: 'contem', rotulo: 'contém' }],
  },
];

beforeEach(() => {
  campos.mockReset().mockResolvedValue(CATALOGO);
  previa.mockReset().mockResolvedValue({
    total: 12, de: 80, em_portugues: 'mais de 3 pedidos', amostra: [],
  });
});

it('os campos e operadores vêm do servidor', async () => {
  render(<ConstrutorDeRegras />);

  await screen.findByRole('option', { name: 'Pedidos feitos' });
  expect(screen.getByRole('option', { name: 'Bairro' })).toBeInTheDocument();
});

it('o operador só abre depois de escolher o campo', async () => {
  const user = userEvent.setup();
  render(<ConstrutorDeRegras />);
  await screen.findByRole('option', { name: 'Pedidos feitos' });

  expect(screen.getByLabelText('Operador')).toBeDisabled();

  await user.selectOptions(screen.getByLabelText('Campo'), 'pedidos');

  expect(screen.getByLabelText('Operador')).toBeEnabled();
  expect(screen.getByRole('option', { name: 'é maior que' })).toBeInTheDocument();
});

it('"está entre" abre duas caixas de valor', async () => {
  const user = userEvent.setup();
  render(<ConstrutorDeRegras />);
  await screen.findByRole('option', { name: 'Pedidos feitos' });

  await user.selectOptions(screen.getByLabelText('Campo'), 'pedidos');
  await user.selectOptions(screen.getByLabelText('Operador'), 'entre');

  expect(screen.getByLabelText('Valor 1')).toBeInTheDocument();
  expect(screen.getByLabelText('Valor 2')).toBeInTheDocument();
});

it('com a condição completa, diz quantos são e repete a regra em português', async () => {
  const user = userEvent.setup();
  render(<ConstrutorDeRegras />);
  await screen.findByRole('option', { name: 'Pedidos feitos' });

  await user.selectOptions(screen.getByLabelText('Campo'), 'pedidos');
  await user.selectOptions(screen.getByLabelText('Operador'), 'maior_que');
  await user.type(screen.getByLabelText('Valor'), '3');

  const aviso = await screen.findByRole('status', {}, { timeout: 3000 });
  expect(aviso).toHaveTextContent('12');
  expect(aviso).toHaveTextContent('mais de 3 pedidos');
});

it('grupo novo aparece separado por OU', async () => {
  const user = userEvent.setup();
  render(<ConstrutorDeRegras />);
  await screen.findByRole('option', { name: 'Pedidos feitos' });

  await user.click(screen.getByRole('button', { name: /Adicionar grupo/ }));

  expect(screen.getByText('ou')).toBeInTheDocument();
  expect(screen.getByText('Grupo 2')).toBeInTheDocument();
});
