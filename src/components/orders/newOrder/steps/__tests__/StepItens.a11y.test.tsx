import React from 'react';
import { render, screen } from '@testing-library/react';
import { StepItens } from '../StepItens';
import type { CartItem } from '../../types';
import type { Product } from '../../../../../services/products';

jest.mock('../../../../../services/products', () => ({
  __esModule: true,
  productsService: { getProducts: jest.fn().mockResolvedValue({ results: [] }) },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

const makeItem = (quantity: number): CartItem => ({
  product: { id: 'p-1', name: 'Pizza Marguerita', price: 30 } as Product,
  quantity,
});

const noop = () => {};

describe('StepItens — acessibilidade dos controles icon-only do carrinho', () => {
  it('dá nome acessível para aumentar e remover o item quando há mais de uma unidade', () => {
    render(
      <StepItens
        storeId="store-1"
        cart={[makeItem(2)]}
        onAdd={noop}
        onQtyChange={noop}
        onRemove={noop}
      />,
    );

    // quantidade > 1: o botão de diminuir apenas decrementa
    expect(
      screen.getByRole('button', { name: 'Diminuir quantidade de Pizza Marguerita' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aumentar quantidade de Pizza Marguerita' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remover Pizza Marguerita do carrinho' }),
    ).toBeInTheDocument();
  });

  it('quando há apenas uma unidade, o botão de diminuir anuncia que remove o item', () => {
    render(
      <StepItens
        storeId="store-1"
        cart={[makeItem(1)]}
        onAdd={noop}
        onQtyChange={noop}
        onRemove={noop}
      />,
    );

    // o botão de diminuir (vira "remover") e a lixeira compartilham o mesmo nome acessível
    expect(
      screen.getAllByRole('button', { name: 'Remover Pizza Marguerita do carrinho' }).length,
    ).toBe(2);
  });
});
