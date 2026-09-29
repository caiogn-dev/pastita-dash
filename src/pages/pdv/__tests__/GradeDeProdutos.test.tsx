import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradeDeProdutos } from '../GradeDeProdutos';

const produtos = [
  { id: 'a', nome: 'Queridinha', preco: 36.99, categoria: 'Saladas' },
  { id: 'b', nome: 'Tilápia Suprema', preco: 46.99, categoria: 'Saladas' },
  { id: 'c', nome: 'Suco de Laranja', preco: 8, categoria: 'Bebidas' },
  { id: 'd', nome: 'Sem estoque', preco: 5, categoria: 'Bebidas', semEstoque: true },
];
const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

describe('GradeDeProdutos', () => {
  it('mostra a 1ª categoria, troca de aba e um toque adiciona', async () => {
    const escolher = jest.fn();
    render(<GradeDeProdutos produtos={produtos} onEscolher={escolher} formatarValor={fmt} naComanda={{ a: 2 }} />);
    expect(screen.getByRole('button', { name: 'Adicionar Queridinha' })).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: 'Adicionar Suco de Laranja' })).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Bebidas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Suco de Laranja' }));
    expect(escolher).toHaveBeenCalledWith('c');
    expect(screen.getByRole('button', { name: 'Adicionar Sem estoque' })).toBeDisabled();
  });
});
