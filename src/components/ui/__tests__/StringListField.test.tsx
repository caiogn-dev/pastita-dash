import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StringListField } from '../StringListField';

/** Wrapper controlado — o componente não guarda a lista, quem guarda é o form. */
const Campo: React.FC<{ inicial?: string[] }> = ({ inicial = [] }) => {
  const [valor, setValor] = useState<string[]>(inicial);
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <StringListField
        label="O que já vem incluso"
        value={valor}
        onChange={setValor}
        placeholder="Ex.: 1 Molho Branco"
      />
      <output data-testid="estado">{JSON.stringify(valor)}</output>
    </form>
  );
};

const digitar = (texto: string) => {
  const entrada = screen.getByPlaceholderText('Ex.: 1 Molho Branco');
  fireEvent.change(entrada, { target: { value: texto } });
  return entrada;
};

test('adiciona um item pelo botão', () => {
  render(<Campo />);
  digitar('1 Molho Branco');
  fireEvent.click(screen.getByRole('button', { name: /adicionar item/i }));

  expect(screen.getByTestId('estado')).toHaveTextContent('["1 Molho Branco"]');
});

test('Enter adiciona sem submeter o formulário', () => {
  const aoSubmeter = jest.fn();
  render(
    <form onSubmit={aoSubmeter}>
      <Campo />
    </form>,
  );
  const entrada = digitar('1 Rondelli de Bacalhau');
  fireEvent.keyDown(entrada, { key: 'Enter' });

  expect(screen.getByTestId('estado')).toHaveTextContent('1 Rondelli de Bacalhau');
  expect(aoSubmeter).not.toHaveBeenCalled();
});

test('não aceita item em branco', () => {
  render(<Campo />);
  digitar('   ');

  expect(screen.getByRole('button', { name: /adicionar item/i })).toBeDisabled();
});

test('remove o item certo quando há repetidos', () => {
  render(<Campo inicial={['Molho', 'Pão', 'Molho']} />);
  fireEvent.click(screen.getAllByRole('button', { name: /remover/i })[2]);

  expect(screen.getByTestId('estado')).toHaveTextContent('["Molho","Pão"]');
});

test('edita um item existente no lugar', () => {
  render(<Campo inicial={['1 Molho Branco']} />);
  fireEvent.change(screen.getByDisplayValue('1 Molho Branco'), {
    target: { value: '2 Molhos Brancos' },
  });

  expect(screen.getByTestId('estado')).toHaveTextContent('["2 Molhos Brancos"]');
});

test('lista vazia não renderiza linha nenhuma', () => {
  render(<Campo />);

  expect(screen.queryAllByRole('button', { name: /remover/i })).toHaveLength(0);
});
