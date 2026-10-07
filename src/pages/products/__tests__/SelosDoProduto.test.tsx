import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SelosDoProduto,
  lerSelos,
  gravarSelos,
  sugestoesDeSelos,
  SELOS_PADRAO,
} from '../SelosDoProduto';

const Campo: React.FC<{ inicial?: string[]; daLoja?: string[] }> = ({ inicial = [], daLoja = [] }) => {
  const [valor, setValor] = useState<string[]>(inicial);
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <SelosDoProduto value={valor} onChange={setValor} sugestoes={sugestoesDeSelos(daLoja)} />
      <output data-testid="estado">{JSON.stringify(valor)}</output>
    </form>
  );
};

const estado = () => JSON.parse(screen.getByTestId('estado').textContent || '[]');

test('tocar num selo sugerido liga, tocar de novo desliga', () => {
  render(<Campo />);
  const zero = screen.getByRole('button', { name: 'Zero lactose' });
  expect(zero).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(zero);
  expect(estado()).toEqual(['Zero lactose']);
  expect(screen.getByRole('button', { name: 'Zero lactose' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Zero lactose' }));
  expect(estado()).toEqual([]);
});

test('a ordem é a de escolha — o primeiro é o que aparece primeiro no card', () => {
  render(<Campo />);
  fireEvent.click(screen.getByRole('button', { name: 'Sem glúten' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fit' }));
  expect(estado()).toEqual(['Sem glúten', 'Fit']);
});

test('selo próprio entra pelo campo e Enter não submete o formulário', () => {
  const aoSubmeter = jest.fn((e) => e.preventDefault());
  render(
    <form onSubmit={aoSubmeter}>
      <Campo />
    </form>,
  );
  const entrada = screen.getByPlaceholderText(/outro selo/i);
  fireEvent.change(entrada, { target: { value: '  Bistrô  ' } });
  fireEvent.keyDown(entrada, { key: 'Enter' });

  expect(aoSubmeter).not.toHaveBeenCalled();
  expect(estado()).toEqual(['Bistrô']);
  expect(entrada).toHaveValue('');
});

test('não duplica selo, nem com caixa ou acento diferente', () => {
  render(<Campo inicial={['Zero lactose']} />);
  const entrada = screen.getByPlaceholderText(/outro selo/i);
  fireEvent.change(entrada, { target: { value: 'zero LACTOSE' } });
  fireEvent.keyDown(entrada, { key: 'Enter' });
  expect(estado()).toEqual(['Zero lactose']);
});

test('selos que a loja já usa viram sugestão, sem repetir os padrão', () => {
  render(<Campo daLoja={['Bistrô', 'Dia a dia', 'fit']} />);
  expect(screen.getByRole('button', { name: 'Bistrô' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dia a dia' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^fit$/i })).toHaveLength(1);
});

test('selo escolhido que não está nas sugestões continua visível e desligável', () => {
  render(<Campo inicial={['Receita da vó']} />);
  const selo = screen.getByRole('button', { name: 'Receita da vó' });
  expect(selo).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(selo);
  expect(estado()).toEqual([]);
});

describe('lerSelos / gravarSelos', () => {
  test('lê lista limpa e ignora lixo', () => {
    expect(lerSelos({ selos: ['Fit', '', '  ', 3 as unknown as string] })).toEqual(['Fit', '3']);
    expect(lerSelos({})).toEqual([]);
    expect(lerSelos(undefined)).toEqual([]);
  });

  test('lista vazia apaga a chave e não mexe no resto de attributes', () => {
    expect(gravarSelos({ inclui: ['Molho'], selos: ['Fit'] }, [])).toEqual({ inclui: ['Molho'] });
    expect(gravarSelos({ inclui: ['Molho'] }, ['Fit'])).toEqual({ inclui: ['Molho'], selos: ['Fit'] });
  });

  test('SELOS_PADRAO cobre os informativos de dieta', () => {
    expect(SELOS_PADRAO).toEqual(expect.arrayContaining(['Zero lactose', 'Sem glúten', 'Zero açúcar', 'Vegano', 'Low Carb', 'Fit']));
  });
});
